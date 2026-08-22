-- Seed: Locations (Cities, Districts, Branches)
-- 8 cities, 8 districts (Merkez), 80+ branches

-- ============================================
-- CITIES
-- ============================================
INSERT INTO cities (name) VALUES
  ('İznik'),
  ('Orhangazi'),
  ('Yalova'),
  ('Altınova'),
  ('Karamürsel'),
  ('Gölcük'),
  ('Gemlik'),
  ('İzmit');

-- ============================================
-- DISTRICTS (Merkez for each city)
-- ============================================
INSERT INTO districts (city_id, name)
SELECT c.id, 'Merkez'
FROM cities c;

-- ============================================
-- BRANCHES
-- ============================================

-- İZNİK
INSERT INTO branches (district_id, name, current_balance, opening_balance)
SELECT d.id, b.name, 0, 0
FROM (
  VALUES
    ('Özpaş'),
    ('Eleia Hotel'),
    ('Dağlı Market'),
    ('Garaj Yanı'),
    ('Güven Ekmek'),
    ('Has Market'),
    ('Yağmur Market'),
    ('Şahin Market'),
    ('Uğur Market'),
    ('Aydın Market'),
    ('Shell Petrol'),
    ('Arabacı Şarküteri'),
    ('Tria Cafe'),
    ('Lezzet Lokantası'),
    ('Enfal Izgara'),
    ('Boyalıca'),
    ('A-101'),
    ('Şen Market'),
    ('Üreğli'),
    ('Hayri Peker'),
    ('Murat (Peynirci)')
) AS b(name)
CROSS JOIN districts d
JOIN cities c ON d.city_id = c.id
WHERE c.name = 'İznik' AND d.name = 'Merkez';

-- ORHANGAZİ
INSERT INTO branches (district_id, name, current_balance, opening_balance)
SELECT d.id, b.name, 0, 0
FROM (
  VALUES
    ('Mücahit Hatipoğlu'),
    ('Peynirci Baba 1 (Yolcu Şarküteri Karşısı)'),
    ('Yolcu Şarküteri'),
    ('Orkun (Pazarcı)'),
    ('Bursa İşkembe'),
    ('Oğuz Şarküteri'),
    ('Peynirci Baba 2'),
    ('Özbeyler Şarküteri')
) AS b(name)
CROSS JOIN districts d
JOIN cities c ON d.city_id = c.id
WHERE c.name = 'Orhangazi' AND d.name = 'Merkez';

-- YALOVA
INSERT INTO branches (district_id, name, current_balance, opening_balance)
SELECT d.id, b.name, 0, 0
FROM (
  VALUES
    ('Soğucak (Şamil)'),
    ('Kahverengi Site'),
    ('Peynirci Baba 3 (Cezaevi Yanı)'),
    ('Pazarcı Emine Abla'),
    ('Kasap Gökhan (Pazarcı)'),
    ('Artvinli Yüksel'),
    ('Peynirci Baba 4 (Merkez)'),
    ('Peynirci Baba 5 (TOKİ)'),
    ('Taze Dükkan'),
    ('Gurme Kuruyemiş'),
    ('Kadıköy Yalova Çiftliği (Camii Yanı)'),
    ('Kadıköy Yalova Çiftliği (Yol Boyu)'),
    ('Peynirci Baba (Çınarcık)'),
    ('Peynir Evi (Çiftlikköy)'),
    ('Peynirci Baba (Çiftlikköy)')
) AS b(name)
CROSS JOIN districts d
JOIN cities c ON d.city_id = c.id
WHERE c.name = 'Yalova' AND d.name = 'Merkez';

-- ALTINOVA
INSERT INTO branches (district_id, name, current_balance, opening_balance)
SELECT d.id, b.name, 0, 0
FROM (
  VALUES
    ('Dostlar Market 1'),
    ('Peynirci Baba 6'),
    ('Dostlar Market 2'),
    ('Dostlar Market 3 (Eğitim)')
) AS b(name)
CROSS JOIN districts d
JOIN cities c ON d.city_id = c.id
WHERE c.name = 'Altınova' AND d.name = 'Merkez';

-- KARAMÜRSEL
INSERT INTO branches (district_id, name, current_balance, opening_balance)
SELECT d.id, b.name, 0, 0
FROM (
  VALUES
    ('Dostlar Market 4 (Camii Altı)'),
    ('Peynirci Baba (Camii Yanı)'),
    ('Dostlar Market (Işıklar)'),
    ('Dostlar Market (Yan yol)'),
    ('Gürmüzlülü Bakkal (Çetin Market)'),
    ('Dostlar Market (Sarıkum)'),
    ('Kaya Şarküteri'),
    ('Peynirci Baba (Çarşı)'),
    ('Dostlar Market (Sahil)')
) AS b(name)
CROSS JOIN districts d
JOIN cities c ON d.city_id = c.id
WHERE c.name = 'Karamürsel' AND d.name = 'Merkez';

-- GÖLCÜK
INSERT INTO branches (district_id, name, current_balance, opening_balance)
SELECT d.id, b.name, 0, 0
FROM (
  VALUES
    ('Peynirci Baba (Değirmendere 1 Aşağı)'),
    ('Peynirci Baba (Değirmendere 2 Yukarı)'),
    ('Peynirci Baba (Merkez)'),
    ('Peynirci Baba (Karakol Karşısı)'),
    ('Peynirci Baba (İhsaniye 1)'),
    ('Peynirci Baba (İhsaniye 2 - Kervansaray)')
) AS b(name)
CROSS JOIN districts d
JOIN cities c ON d.city_id = c.id
WHERE c.name = 'Gölcük' AND d.name = 'Merkez';

-- GEMLİK
INSERT INTO branches (district_id, name, current_balance, opening_balance)
SELECT d.id, b.name, 0, 0
FROM (
  VALUES
    ('Peynirci Baba (Manastır)'),
    ('Peynirci Baba (Kumla)'),
    ('Peynirci Baba (Kanal Boyu)'),
    ('Peynirci Baba (Merkez)'),
    ('Peynirci Baba (Pazar Yeri Karşısı)'),
    ('Başaran Zeytin')
) AS b(name)
CROSS JOIN districts d
JOIN cities c ON d.city_id = c.id
WHERE c.name = 'Gemlik' AND d.name = 'Merkez';

-- İZMİT
INSERT INTO branches (district_id, name, current_balance, opening_balance)
SELECT d.id, b.name, 0, 0
FROM (
  VALUES
    ('Peynirci Baba (Bahçecik)'),
    ('Peynirci Baba (Başiskele)'),
    ('Peynirci Baba (Yuvacık)'),
    ('Peynirci Baba (Yeşilyurt)'),
    ('Peynirci Baba (Ali Kahya)'),
    ('Peynirci Baba (Yahya Kaptan)'),
    ('Peynirci Baba (Mimar Sinan)'),
    ('Peynirci Baba (Merkez)'),
    ('Peynirci Baba (Mehmet Ali Paşa)'),
    ('Peynirci Baba (Bekir Paşa)'),
    ('Peynirci Baba (Bağçeşme)'),
    ('Peynirci Baba (Boğazova)'),
    ('Peynirci Baba (Yeşilova)')
) AS b(name)
CROSS JOIN districts d
JOIN cities c ON d.city_id = c.id
WHERE c.name = 'İzmit' AND d.name = 'Merkez';
