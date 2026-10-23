import { CalendarCheck, ShoppingBag } from 'lucide-react'

/** "Book a table" / "Order online" (Partner). Links go to the venue's own systems; taps are counted. */
export default function PlaceBookingButtons({ bookingUrl, orderUrl }: { bookingUrl: string | null; orderUrl: string | null }) {
  if (!bookingUrl && !orderUrl) return null
  return (
    <div className="flex flex-wrap gap-2">
      {bookingUrl && (
        <a href={bookingUrl} target="_blank" rel="noopener noreferrer" data-place-action="booking" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary-btn text-sm font-medium hover:opacity-90">
          <CalendarCheck className="h-4 w-4" /> Book a table
        </a>
      )}
      {orderUrl && (
        <a href={orderUrl} target="_blank" rel="noopener noreferrer" data-place-action="order" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl ghost-border text-sm font-medium text-on-surface hover:bg-surface-container-low">
          <ShoppingBag className="h-4 w-4" /> Order online
        </a>
      )}
    </div>
  )
}
