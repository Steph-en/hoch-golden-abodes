-- ============================================================
-- Sample stays data: 1 hotel + 1 serviced apartment complex
-- with rooms seeded for each so the /stays flow is testable.
-- ============================================================

DO $$
DECLARE
  hotel_id  INTEGER;
  apt_id    INTEGER;
BEGIN

  -- ── ESP Heights Hotel ──────────────────────────────────────
  INSERT INTO public.properties (
    title, location, area, price, price_value,
    beds, baths, sqft, type, featured, description,
    amenities, year_built, parking, status, listing_kind,
    image_url, images
  ) VALUES (
    'ESP Heights Hotel',
    'Labone, Accra',
    'Labone',
    'From $90/night',
    90, 0, 0, '0',
    'Hotel', true,
    'ESP HEIGHTS is a contemporary 9-storey luxury hotel in Labone, Accra. Featuring a private gym, rooftop pool, full-service spa, fine dining, a lively bar, and 24/7 butler concierge — it is the address of choice for discerning travellers in the capital.',
    ARRAY['Rooftop Pool','Spa','Gym','Restaurant','Bar','Concierge','24/7 Security','High-Speed WiFi','Valet Parking','Room Service','Conference Rooms','Airport Transfer'],
    2020, 50, 'Available', 'hotel',
    'https://res.cloudinary.com/degd6ahfu/image/upload/v1773847728/A_A-84_jwjidu.jpg',
    ARRAY[
      'https://res.cloudinary.com/degd6ahfu/image/upload/v1773847728/A_A-84_jwjidu.jpg',
      'https://res.cloudinary.com/degd6ahfu/image/upload/v1773847725/A_A-100_sygfjb.jpg',
      'https://res.cloudinary.com/degd6ahfu/image/upload/v1773847727/A_A-110_gljzjn.jpg',
      'https://res.cloudinary.com/degd6ahfu/image/upload/v1773847727/A_A-113_yajogy.jpg'
    ]
  ) RETURNING id INTO hotel_id;

  -- Rooms for ESP Heights
  INSERT INTO public.rooms (
    property_id, name, description, room_type, capacity,
    bed_config, amenities, images, nightly_price, currency,
    status, booking_rules
  ) VALUES
  (
    hotel_id, 'Standard Room',
    'A well-appointed standard room with city views, premium bedding, and a marble en-suite bathroom.',
    'Standard', 2, '1 Queen Bed',
    ARRAY['WiFi','Smart TV','Air Conditioning','Mini Bar','In-Room Safe','En-suite Bathroom','Iron & Board'],
    ARRAY[
      'https://res.cloudinary.com/degd6ahfu/image/upload/v1773847733/A_A-130_ex9xds.jpg',
      'https://res.cloudinary.com/degd6ahfu/image/upload/v1773847729/A_A-96_wj6sg6.jpg'
    ],
    90, 'USD', 'active',
    '{"min_nights": 1, "max_nights": 30, "check_in_time": "14:00", "check_out_time": "12:00"}'::jsonb
  ),
  (
    hotel_id, 'Deluxe Room',
    'Spacious deluxe room with panoramic city views, a king-size bed, and premium amenities for an elevated stay.',
    'Deluxe', 2, '1 King Bed',
    ARRAY['WiFi','Smart TV','Air Conditioning','Mini Bar','In-Room Safe','Bathtub & Shower','Nespresso Machine','Bathrobe & Slippers'],
    ARRAY[
      'https://res.cloudinary.com/degd6ahfu/image/upload/v1773847725/A_A-100_sygfjb.jpg',
      'https://res.cloudinary.com/degd6ahfu/image/upload/v1773847727/A_A-110_gljzjn.jpg'
    ],
    150, 'USD', 'active',
    '{"min_nights": 1, "max_nights": 30, "check_in_time": "14:00", "check_out_time": "12:00"}'::jsonb
  ),
  (
    hotel_id, 'Executive Suite',
    'A luxurious suite with a separate living area, dining space, and exclusive executive lounge access.',
    'Suite', 3, '1 King Bed + Sofa Bed',
    ARRAY['WiFi','Smart TV','Air Conditioning','Full Mini Bar','Kitchenette','Bathtub & Rain Shower','Executive Lounge Access','Lounge Area','Nespresso Machine','Bathrobe & Slippers'],
    ARRAY[
      'https://res.cloudinary.com/degd6ahfu/image/upload/v1773847727/A_A-113_yajogy.jpg',
      'https://res.cloudinary.com/degd6ahfu/image/upload/v1773847728/A_A-91_uxvyxl.jpg'
    ],
    280, 'USD', 'active',
    '{"min_nights": 2, "max_nights": 60, "check_in_time": "14:00", "check_out_time": "12:00"}'::jsonb
  ),
  (
    hotel_id, 'Executive Twin Room',
    'Modern twin room designed for business travellers with two single beds and a dedicated workspace.',
    'Executive', 2, '2 Single Beds',
    ARRAY['WiFi','Smart TV','Air Conditioning','Work Desk','Mini Bar','In-Room Safe','Iron & Board'],
    ARRAY[
      'https://res.cloudinary.com/degd6ahfu/image/upload/v1773847729/A_A-97_y1xaoj.jpg',
      'https://res.cloudinary.com/degd6ahfu/image/upload/v1773847729/A_A-96_wj6sg6.jpg'
    ],
    130, 'USD', 'active',
    '{"min_nights": 1, "max_nights": 30, "check_in_time": "14:00", "check_out_time": "12:00"}'::jsonb
  ),
  (
    hotel_id, 'Penthouse Suite',
    'The pinnacle of luxury on the 9th floor. Private rooftop terrace, butler service, jacuzzi, and unrivalled panoramic views of Accra.',
    'Penthouse', 4, '2 King Beds',
    ARRAY['WiFi','Smart TV x3','Air Conditioning','Full Bar','Private Rooftop Terrace','Jacuzzi','Butler Service','Gourmet Kitchen','Dining Room','Bathrobe & Slippers','Rolls Royce Transfer'],
    ARRAY[
      'https://res.cloudinary.com/degd6ahfu/image/upload/v1773847733/A_A-124_q5tztk.jpg',
      'https://res.cloudinary.com/degd6ahfu/image/upload/v1773847726/A_A-128_xapmob.jpg',
      'https://res.cloudinary.com/degd6ahfu/image/upload/v1773847733/A_A-130_ex9xds.jpg'
    ],
    750, 'USD', 'active',
    '{"min_nights": 2, "max_nights": 14, "check_in_time": "14:00", "check_out_time": "14:00"}'::jsonb
  );


  -- ── Skyline Serviced Apartments ────────────────────────────
  INSERT INTO public.properties (
    title, location, area, price, price_value,
    beds, baths, sqft, type, featured, description,
    amenities, year_built, parking, status, listing_kind,
    image_url, images
  ) VALUES (
    'Skyline Serviced Apartments',
    'East Legon, Accra',
    'East Legon',
    'From $80/night',
    80, 0, 0, '0',
    'Apartment', true,
    'Premium fully furnished serviced apartments in the heart of East Legon. Perfect for business stays, family relocations, or extended visits. All units come with high-speed WiFi, smart home controls, and a dedicated concierge team.',
    ARRAY['WiFi','Swimming Pool','Gym','24/7 Security','Covered Parking','Laundry Room','Rooftop Garden','Concierge','CCTV','Backup Generator'],
    2022, 30, 'Available', 'rental_property',
    'https://res.cloudinary.com/degd6ahfu/image/upload/v1778356562/236_uu6k1d.jpg',
    ARRAY[
      'https://res.cloudinary.com/degd6ahfu/image/upload/v1778356562/236_uu6k1d.jpg',
      'https://res.cloudinary.com/degd6ahfu/image/upload/v1778356562/43_qncvgo.jpg',
      'https://res.cloudinary.com/degd6ahfu/image/upload/v1778356563/240_pwrtjv.jpg',
      'https://res.cloudinary.com/degd6ahfu/image/upload/v1778356565/38_asqmpm.jpg'
    ]
  ) RETURNING id INTO apt_id;

  -- Units/apartments
  INSERT INTO public.rooms (
    property_id, name, description, room_type, capacity,
    bed_config, amenities, images, nightly_price, currency,
    status, booking_rules
  ) VALUES
  (
    apt_id, 'Studio Apartment',
    'A cosy self-contained studio with a fully-equipped kitchenette, comfortable sleeping area, and modern finishes.',
    'Studio', 2, '1 Double Bed',
    ARRAY['WiFi','Smart TV','Air Conditioning','Kitchenette','Microwave','Fridge','Washing Machine','Balcony'],
    ARRAY[
      'https://res.cloudinary.com/degd6ahfu/image/upload/v1778356509/3_rfhjjl.jpg',
      'https://res.cloudinary.com/degd6ahfu/image/upload/v1778356506/1_mxhngg.jpg'
    ],
    80, 'USD', 'active',
    '{"min_nights": 2, "max_nights": 90, "check_in_time": "15:00", "check_out_time": "11:00"}'::jsonb
  ),
  (
    apt_id, '1-Bedroom Apartment',
    'Spacious one-bedroom apartment with a separate living room, fully-equipped kitchen, and a private balcony with garden views.',
    '1-Bedroom', 3, '1 King Bed',
    ARRAY['WiFi','Smart TV','Air Conditioning','Full Kitchen','Dining Table','Sofa','Washing Machine','Balcony','Iron & Board'],
    ARRAY[
      'https://res.cloudinary.com/degd6ahfu/image/upload/v1778356508/4_mfhycd.jpg',
      'https://res.cloudinary.com/degd6ahfu/image/upload/v1778356508/2_piniku.jpg',
      'https://res.cloudinary.com/degd6ahfu/image/upload/v1778356510/5_xa99aw.jpg'
    ],
    120, 'USD', 'active',
    '{"min_nights": 3, "max_nights": 180, "check_in_time": "15:00", "check_out_time": "11:00"}'::jsonb
  ),
  (
    apt_id, '2-Bedroom Apartment',
    'Generous two-bedroom apartment ideal for families or small groups. Features two en-suite bathrooms, a full kitchen, and a large living/dining area.',
    '2-Bedroom', 5, '1 King Bed + 1 Queen Bed',
    ARRAY['WiFi','Smart TV x2','Air Conditioning','Full Kitchen','2 En-suite Bathrooms','Dining Table','Sofa','Washing Machine','2 Balconies'],
    ARRAY[
      'https://res.cloudinary.com/degd6ahfu/image/upload/v1778356512/6_ipnsub.jpg',
      'https://res.cloudinary.com/degd6ahfu/image/upload/v1778356512/7_rbo70e.jpg',
      'https://res.cloudinary.com/degd6ahfu/image/upload/v1778356512/8_vn5c3v.jpg'
    ],
    185, 'USD', 'active',
    '{"min_nights": 3, "max_nights": 180, "check_in_time": "15:00", "check_out_time": "11:00"}'::jsonb
  ),
  (
    apt_id, '3-Bedroom Penthouse',
    'The crown jewel of Skyline — a full-floor penthouse with three bedrooms, a wrap-around terrace, private jacuzzi, and dedicated concierge. For those who settle for nothing less.',
    '3-Bedroom Penthouse', 7, '3 King Beds',
    ARRAY['WiFi','Smart TV x4','Air Conditioning','Gourmet Kitchen','3 En-suite Bathrooms','Wrap-around Terrace','Private Jacuzzi','Dining Room','Home Office','Washing/Drying','Dedicated Concierge'],
    ARRAY[
      'https://res.cloudinary.com/degd6ahfu/image/upload/v1778356563/240_pwrtjv.jpg',
      'https://res.cloudinary.com/degd6ahfu/image/upload/v1778356565/38_asqmpm.jpg',
      'https://res.cloudinary.com/degd6ahfu/image/upload/v1778356563/238_eoxeax.jpg'
    ],
    380, 'USD', 'active',
    '{"min_nights": 5, "max_nights": 180, "check_in_time": "15:00", "check_out_time": "12:00"}'::jsonb
  );

END;
$$;