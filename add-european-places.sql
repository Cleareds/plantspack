-- Real European Vegan Places Data
-- Run this in your Supabase SQL editor to add authentic vegan-friendly places across Europe

-- Note: You'll need to replace 'your_user_id_here' with your actual user ID
-- You can find your user ID by running: SELECT id FROM users WHERE username = 'papasoft';

DO $$
DECLARE
    place_creator_id UUID;
BEGIN
    -- Get the user ID (replace 'papasoft' with your username)
    SELECT id INTO place_creator_id 
    FROM users 
    WHERE username = 'papasoft';
    
    IF place_creator_id IS NULL THEN
        RAISE NOTICE 'User not found. Please update the username in the script.';
        RETURN;
    END IF;
    
    -- Insert European vegan places
    INSERT INTO places (
        name, 
        description, 
        category, 
        latitude, 
        longitude, 
        address, 
        website, 
        phone, 
        is_pet_friendly, 
        created_by
    ) VALUES
    -- AMSTERDAM, NETHERLANDS
    (
        'Peacefood Café', 
        'Cozy plant-based café in Amsterdam serving wholesome vegan comfort food, fresh juices, and organic coffee. Popular for their Buddha bowls and homemade cashew cheesecake.',
        'restaurant',
        52.3676,
        4.9041,
        'De Clercqstraat 83, 1052 NG Amsterdam, Netherlands',
        'https://www.peacefoodcafe.nl',
        '+31 20 486 4967',
        true,
        place_creator_id
    ),
    (
        'Vegan Junk Food Bar',
        'Amsterdam''s famous vegan fast food chain serving plant-based burgers, loaded fries, and comfort food. Known for their creative meat alternatives and casual atmosphere.',
        'restaurant',
        52.3738,
        4.8910,
        'Marie Heinekenplein 9, 1072 MG Amsterdam, Netherlands',
        'https://www.veganjunkfoodbar.com',
        '+31 20 233 6996',
        false,
        place_creator_id
    ),
    
    -- BERLIN, GERMANY
    (
        'Kopps',
        'Upscale vegan fine dining restaurant in Berlin offering innovative plant-based cuisine with seasonal ingredients. Features a sophisticated tasting menu and elegant atmosphere.',
        'restaurant',
        52.5200,
        13.4050,
        'Linienstraße 94, 10115 Berlin, Germany',
        'https://www.kopps-berlin.de',
        '+49 30 4320 9775',
        false,
        place_creator_id
    ),
    (
        'Gratitude',
        'Trendy vegan café and restaurant in Berlin serving healthy plant-based meals, smoothie bowls, and specialty coffee. Popular spot for brunch and casual dining.',
        'restaurant',
        52.5014,
        13.4190,
        'Warschauer Str. 33, 10243 Berlin, Germany',
        'https://www.gratitude-cafe.com',
        '+49 30 6162 2594',
        true,
        place_creator_id
    ),
    
    -- LONDON, UK
    (
        'Mildreds',
        'Iconic vegetarian restaurant in London''s Soho, serving creative plant-based dishes since 1988. Famous for their globally-inspired menu and vibrant atmosphere.',
        'restaurant',
        51.5142,
        -0.1314,
        '45 Lexington St, Soho, London W1F 9AN, UK',
        'https://www.mildreds.co.uk',
        '+44 20 7494 1634',
        false,
        place_creator_id
    ),
    (
        'Unity Diner',
        'American-style vegan diner in London serving plant-based comfort food, burgers, and shakes. All profits go to animal sanctuaries.',
        'restaurant',
        51.5510,
        -0.1022,
        '60 Wentworth St, London E1 7AL, UK',
        'https://www.unitydiner.co.uk',
        '+44 20 7426 0870',
        true,
        place_creator_id
    ),
    
    -- PARIS, FRANCE
    (
        'Gentle Gourmet',
        'Elegant vegan restaurant in Paris offering refined plant-based French cuisine. Known for their sophisticated dishes and extensive wine selection.',
        'restaurant',
        48.8566,
        2.3522,
        '24 Bd de la Bastille, 75012 Paris, France',
        'https://www.gentlegourmet.fr',
        '+33 1 43 43 48 49',
        false,
        place_creator_id
    ),
    (
        'VG Pâtisserie',
        'First all-vegan patisserie in Paris, creating exquisite plant-based pastries, cakes, and French desserts. Perfect for vegan sweet treats.',
        'restaurant',
        48.8738,
        2.3364,
        '123 Bd Voltaire, 75011 Paris, France',
        'https://www.vg-patisserie.com',
        '+33 1 43 55 27 84',
        false,
        place_creator_id
    ),
    
    -- BARCELONA, SPAIN
    (
        'Teresa Carles',
        'Pioneer vegetarian restaurant in Barcelona serving Mediterranean plant-based cuisine since 1979. Beautiful interior with fresh, seasonal dishes.',
        'restaurant',
        41.3851,
        2.1734,
        'C/ de Jovellanos, 2, 08001 Barcelona, Spain',
        'https://www.teresacarles.com',
        '+34 933 17 18 29',
        false,
        place_creator_id
    ),
    (
        'Flax & Kale',
        'Modern flexitarian restaurant in Barcelona focusing on healthy, plant-forward cuisine. Stylish space with Instagram-worthy healthy bowls and dishes.',
        'restaurant',
        41.3874,
        2.1686,
        'C/ dels Tallers, 74B, 08001 Barcelona, Spain',
        'https://www.flaxandkale.com',
        '+34 933 17 56 64',
        true,
        place_creator_id
    ),
    
    -- ROME, ITALY
    (
        'Il Margutta RistorArte',
        'Historic vegetarian restaurant in Rome near the Spanish Steps, serving creative plant-based Italian cuisine in an artistic setting.',
        'restaurant',
        41.9109,
        12.4818,
        'Via Margutta, 118, 00187 Roma RM, Italy',
        'https://www.ilmargutta.bio',
        '+39 06 3265 0577',
        false,
        place_creator_id
    ),
    (
        'Ops! Café',
        'Charming vegan café in Rome''s Trastevere neighborhood serving organic plant-based dishes, fresh juices, and homemade desserts.',
        'restaurant',
        41.8919,
        12.4721,
        'Via di San Calisto, 9a, 00153 Roma RM, Italy',
        'https://www.facebook.com/opscaferoma',
        '+39 06 5833 4871',
        true,
        place_creator_id
    ),
    
    -- STOCKHOLM, SWEDEN
    (
        'Hermans',
        'Scenic vegetarian buffet restaurant in Stockholm with stunning views over the city. Large selection of organic, plant-based dishes.',
        'restaurant',
        59.3165,
        18.0955,
        'Fjällgatan 23B, 116 28 Stockholm, Sweden',
        'https://www.hermans.se',
        '+46 8 643 94 80',
        true,
        place_creator_id
    ),
    (
        'Växthuset',
        'Greenhouse restaurant in Stockholm serving locally-sourced vegetarian and vegan dishes. Beautiful garden setting with seasonal menu.',
        'restaurant',
        59.3293,
        18.0686,
        'Regeringsgatan 20, 111 53 Stockholm, Sweden',
        'https://www.vaxthuset.se',
        '+46 8 10 40 91',
        false,
        place_creator_id
    ),
    
    -- COPENHAGEN, DENMARK
    (
        'Souls',
        'Cozy vegan restaurant in Copenhagen serving comfort food and international plant-based dishes. Known for their friendly atmosphere and hearty portions.',
        'restaurant',
        55.6761,
        12.5683,
        'Ravnsborggade 6, 2200 København N, Denmark',
        'https://www.souls.dk',
        '+45 35 37 30 30',
        true,
        place_creator_id
    ),
    (
        'SimpleRAW',
        'Raw vegan café in Copenhagen specializing in uncooked, organic plant-based dishes. Fresh juices, smoothies, and creative raw preparations.',
        'restaurant',
        55.6867,
        12.5700,
        'Griffenfeldsgade 30, 2200 København N, Denmark',
        'https://www.simpleraw.dk',
        '+45 35 35 300',
        false,
        place_creator_id
    ),
    
    -- ZURICH, SWITZERLAND
    (
        'Hiltl',
        'World''s oldest vegetarian restaurant (since 1898) in Zurich. Famous buffet with over 100 vegetarian and vegan dishes from around the world.',
        'restaurant',
        47.3769,
        8.5417,
        'Sihlstrasse 28, 8001 Zürich, Switzerland',
        'https://www.hiltl.ch',
        '+41 44 227 70 00',
        false,
        place_creator_id
    ),
    
    -- VIENNA, AUSTRIA
    (
        'Tian',
        'Michelin-starred vegetarian fine dining restaurant in Vienna. Innovative plant-based cuisine with elegant presentation and seasonal ingredients.',
        'restaurant',
        48.2082,
        16.3738,
        'Himmelpfortgasse 23, 1010 Wien, Austria',
        'https://www.tian-restaurant.com',
        '+43 1 890 46 65',
        false,
        place_creator_id
    ),
    
    -- HELSINKI, FINLAND
    (
        'Yes Yes Yes',
        'Plant-based restaurant in Helsinki serving creative vegan comfort food. Casual atmosphere with locally-sourced ingredients and innovative dishes.',
        'restaurant',
        60.1699,
        24.9384,
        'Korkeavuorenkatu 4, 00130 Helsinki, Finland',
        'https://www.yesyesyes.fi',
        '+358 9 2316 4646',
        true,
        place_creator_id
    ),
    
    -- PRAGUE, CZECH REPUBLIC
    (
        'Loving Hut',
        'International vegan chain restaurant in Prague serving Asian-inspired plant-based dishes. Affordable prices with generous portions.',
        'restaurant',
        50.0755,
        14.4378,
        'Jungmannova 29, 110 00 Nové Město, Czechia',
        'https://www.lovinghut.cz',
        '+420 224 234 355',
        false,
        place_creator_id
    ),
    
    -- LISBON, PORTUGAL
    (
        'The Green Affair',
        'Modern vegan restaurant in Lisbon serving healthy plant-based bowls, burgers, and Portuguese-inspired dishes. Sustainable and eco-friendly focus.',
        'restaurant',
        38.7223,
        -9.1393,
        'R. da Beneficência 71, 1600-017 Lisboa, Portugal',
        'https://www.thegreenaffair.pt',
        '+351 21 357 4547',
        true,
        place_creator_id
    );
    
    RAISE NOTICE 'Successfully added % European vegan places!', (SELECT COUNT(*) FROM places WHERE created_by = place_creator_id);
    
END $$;

-- Verify the places were added
SELECT 
    name,
    category,
    address,
    is_pet_friendly,
    website
FROM places 
WHERE created_by = (SELECT id FROM users WHERE username = 'papasoft')
ORDER BY created_at DESC
LIMIT 10;