-- ============================================
-- M22_RETIRE: list_branches_analytics overload temizliği
-- ============================================
-- M22 (location sıralama) eklenirken fonksiyon imzası değişmişti; M23
-- tekrar `CREATE OR REPLACE` ile yeni parametreleri (p_city_id,
-- p_district_id) ekleyince PG iki ayrı overload bıraktı. Bu eski
-- imzayı düşürürüz, sadece M23 tanımı kalsın.
--
-- Migration geriye dönük uyumlu değildir; yalnızca henüz M22 ile
-- eşleşmemiş DB instance'larında çalıştırılmalıdır. Production'a
-- dağıtım öncesi M22 hiçbir yere pushlanmadı, dolayısıyla bu
-- migration M22'nin fonksiyonunu silmeye çalışırsa "function does
-- not exist" hatası alır. Güvenli: eski imzayı IF EXISTS ile sileriz.

DROP FUNCTION IF EXISTS public.list_branches_analytics(
  TEXT, TEXT, DATE, DATE, SMALLINT[], TEXT, TEXT, INT, INT
);
