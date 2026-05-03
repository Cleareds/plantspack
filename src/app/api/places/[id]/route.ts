import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

// Create Supabase client for public reads
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Support both UUID and slug lookups
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    const column = isUuid ? 'id' : 'slug'

    // Fetch place with creator info and favorites
    const { data: place, error } = await supabase
      .from('places')
      .select(`
        *,
        users:created_by (
          id,
          username,
          first_name,
          last_name,
          avatar_url
        ),
        favorite_places (
          id,
          user_id
        )
      `)
      .eq(column, id)
      .is('archived_at', null)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Place not found' },
          { status: 404 }
        )
      }
      throw error
    }

    // Always use the resolved UUID (the URL param may be a slug).
    const placeId = place.id

    // Get average rating
    const { data: avgRating } = await supabase
      .rpc('get_place_average_rating', { p_place_id: placeId })

    // Get rating distribution
    const { data: distribution } = await supabase
      .rpc('get_place_rating_distribution', { p_place_id: placeId })

    // Get review count
    const { count: reviewCount } = await supabase
      .from('place_reviews')
      .select('*', { count: 'exact', head: true })
      .eq('place_id', placeId)
      .is('deleted_at', null)

    return NextResponse.json({
      place: {
        ...place,
        average_rating: avgRating || 0,
        review_count: reviewCount || 0,
        rating_distribution: distribution || {
          '5': 0,
          '4': 0,
          '3': 0,
          '2': 0,
          '1': 0,
          total: 0
        }
      }
    })
  } catch (error) {
    console.error('[Place API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch place details' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const serverSupabase = await createServerClient()

    // Check authentication
    const { data: { session } } = await serverSupabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch existing place to check ownership
    const { data: existingPlace, error: fetchError } = await supabase
      .from('places')
      .select('id, created_by, images, address')
      .eq('id', id)
      .single()

    if (fetchError || !existingPlace) {
      return NextResponse.json({ error: 'Place not found' }, { status: 404 })
    }

    // Check authorization: admin, creator, or verified owner
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single()

    const isAdmin = userProfile?.role === 'admin'
    const isCreator = existingPlace.created_by === session.user.id
    let isOwner = false
    if (!isAdmin && !isCreator) {
      const { data: ownerRecord } = await supabase
        .from('place_owners')
        .select('id')
        .eq('place_id', id)
        .eq('user_id', session.user.id)
        .is('removed_at', null)
        .maybeSingle()
      isOwner = !!ownerRecord
    }

    if (!isAdmin && !isCreator && !isOwner) {
      return NextResponse.json({ error: 'Not authorized to edit this place' }, { status: 403 })
    }

    const body = await request.json()

    // Build update object with allowed fields
    const updateData: Record<string, any> = {}
    const allowedFields = [
      'name', 'description', 'category', 'address', 'latitude', 'longitude',
      'website', 'phone', 'is_pet_friendly', 'images', 'main_image_url', 'tags',
      'opening_hours', 'event_time', 'city', 'country', 'vegan_level'
    ]

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    // Handle image append mode: merge new images with existing
    if (body.append_images && Array.isArray(body.append_images) && body.append_images.length > 0) {
      const currentImages = existingPlace.images || []
      updateData.images = [...currentImages, ...body.append_images]
    }

    // Geocode new address to update map coordinates (skip if client already sent coords)
    if (body.address && body.address !== existingPlace.address && !body.latitude) {
      try {
        // accept-language=en forces Nominatim to return city/country names
        // in English regardless of the input language. Otherwise a Ukrainian
        // address comes back as "Київ"/"Україна", a German one as "München"/
        // "Deutschland", etc. — we want one canonical English label per
        // place so search and aggregation stay consistent. The Accept-Language
        // header alone is sometimes ignored by Nominatim's CDN layer, so we
        // also pass the query parameter (which is authoritative).
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(body.address)}&limit=1&addressdetails=1&accept-language=en`,
          { headers: { 'User-Agent': 'PlantsPack/1.0 (plantspack.com)', 'Accept-Language': 'en' } }
        )
        if (geoRes.ok) {
          const geoData = await geoRes.json()
          if (geoData[0]) {
            updateData.latitude = parseFloat(geoData[0].lat)
            updateData.longitude = parseFloat(geoData[0].lon)
            // Update city/country from geocoding if available
            const addr = geoData[0].address || {}
            const city = addr.city || addr.town || addr.village || addr.municipality
            if (city) updateData.city = city
            if (addr.country) updateData.country = addr.country
          }
        }
      } catch (geoErr) {
        console.error('[Place API] Geocoding failed:', geoErr)
        // Continue without updating coordinates — address text still saves
      }
    }

    updateData.updated_at = new Date().toISOString()

    // Use the server client for the update (RLS will check ownership)
    const { data: updatedPlace, error: updateError } = await serverSupabase
      .from('places')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('[Place API] Update error:', updateError)
      return NextResponse.json({ error: 'Failed to update place' }, { status: 500 })
    }

    // Sync images to linked posts (posts with place_id pointing to this place)
    // Use admin client to bypass RLS on posts table
    if (updateData.images) {
      const admin = createAdminClient()
      const { error: syncError } = await admin
        .from('posts')
        .update({ images: updateData.images, image_urls: updateData.images })
        .eq('place_id', id)
      if (syncError) {
        console.error('[Place API] Image sync to posts failed:', syncError)
      }
    }

    // Revalidate cached pages that show this place. Errors here are
    // surfaced (was previously a silent catch) so any future cache-bust
    // failure is at least visible in the server logs.
    try {
      revalidatePath(`/place/${id}`)
      if (updatedPlace?.slug && updatedPlace.slug !== id) {
        revalidatePath(`/place/${updatedPlace.slug}`)
      }
      if (updatedPlace?.city && updatedPlace?.country) {
        const countrySlug = updatedPlace.country.toLowerCase().replace(/\s+/g, '-')
        const citySlug = updatedPlace.city.toLowerCase().replace(/\s+/g, '-')
        revalidatePath(`/vegan-places/${countrySlug}/${citySlug}`)
        revalidatePath(`/vegan-places/${countrySlug}`)
      }
    } catch (revalidateErr) {
      console.error('[Place API] revalidatePath failed:', revalidateErr)
    }

    return NextResponse.json({ place: updatedPlace })
  } catch (error) {
    console.error('[Place API] Error:', error)
    return NextResponse.json({ error: 'Failed to update place' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const serverSupabase = await createServerClient()

    const { data: { session } } = await serverSupabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()

    // Fetch place to check ownership (include slug + city for revalidation)
    const { data: place } = await admin
      .from('places')
      .select('id, created_by, slug, city, country')
      .eq('id', id)
      .single()

    if (!place) {
      return NextResponse.json({ error: 'Place not found' }, { status: 404 })
    }

    // Check authorization
    const { data: userProfile } = await admin
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single()

    const isAdmin = userProfile?.role === 'admin'
    const isCreator = place.created_by === session.user.id

    if (!isAdmin && !isCreator) {
      return NextResponse.json({ error: 'Not authorized to delete this place' }, { status: 403 })
    }

    // Soft-delete: set archived_at instead of hard DELETE.
    // Hard DELETE fails on FK constraints (pack_places, staging, trips, etc.)
    // and violates the never-delete-data policy. Matches admin/places route.
    const { error } = await admin
      .from('places')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error

    // Revalidate cached pages — both UUID and slug paths
    try {
      revalidatePath(`/place/${id}`)
      if (place?.slug) revalidatePath(`/place/${place.slug}`)
      revalidatePath('/vegan-places')
      if (place?.city && place?.country) {
        const countrySlug = place.country.toLowerCase().replace(/\s+/g, '-')
        const citySlug = place.city.toLowerCase().replace(/\s+/g, '-')
        revalidatePath(`/vegan-places/${countrySlug}/${citySlug}`)
        revalidatePath(`/vegan-places/${countrySlug}`)
      }
    } catch {}

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Place API] Delete error:', error)
    return NextResponse.json({ error: 'Failed to delete place' }, { status: 500 })
  }
}
