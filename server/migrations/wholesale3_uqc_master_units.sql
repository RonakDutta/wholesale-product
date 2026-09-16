-- =========================================================================
-- Add uqc column to master_units and seed official GST UQC codes
-- Statutory compliance: CBIC / GST Portal Unique Quantity Codes (UQC)
-- =========================================================================

ALTER TABLE master_units
  ADD COLUMN IF NOT EXISTS uqc VARCHAR(10);

COMMENT ON COLUMN master_units.uqc IS
  'Official 3-character Unique Quantity Code prescribed by the GST Council';

-- Idempotent mapping of standard units to official GST UQC codes (case-insensitive)
UPDATE master_units
SET uqc = CASE
  -- Pieces / Pcs -> PCS
  WHEN LOWER(code) IN ('pcs', 'pc', 'piece', 'pieces') OR LOWER(name) ~* '^(piece|pieces|pcs)$' THEN 'PCS'
  -- Numbers / Nos / Quantity -> NOS
  WHEN LOWER(code) IN ('nos', 'no', 'number', 'numbers', 'quantity', 'qty') OR LOWER(name) ~* '^(number|numbers|nos|quantity|qty)$' THEN 'NOS'
  -- Kilograms / Kg / Kgs -> KGS
  WHEN LOWER(code) IN ('kg', 'kgs', 'kilogram', 'kilograms') OR LOWER(name) ~* '^(kilogram|kilograms|kg|kgs)$' THEN 'KGS'
  -- Grams / Gms -> GMS
  WHEN LOWER(code) IN ('gm', 'gms', 'gram', 'grams') OR LOWER(name) ~* '^(gram|grams|gm|gms)$' THEN 'GMS'
  -- Meters / Metre / Mtr -> MTR
  WHEN LOWER(code) IN ('mtr', 'meter', 'meters', 'metre', 'metres') OR LOWER(name) ~* '^(metre|metres|meter|meters|mtr)$' THEN 'MTR'
  -- Boxes / Box -> BOX
  WHEN LOWER(code) IN ('box', 'boxes', 'case') OR LOWER(name) ~* '^(box|boxes|case)$' THEN 'BOX'
  -- Bags / Bag -> BAG
  WHEN LOWER(code) IN ('bag', 'bags') OR LOWER(name) ~* '^(bag|bags)$' THEN 'BAG'
  -- Cartons / Ctn -> CTN
  WHEN LOWER(code) IN ('ctn', 'carton', 'cartons') OR LOWER(name) ~* '^(carton|cartons|ctn)$' THEN 'CTN'
  -- Dozen / Doz -> DOZ
  WHEN LOWER(code) IN ('doz', 'dozen') OR LOWER(name) ~* '^(dozen|doz)$' THEN 'DOZ'
  -- Bundles / Bdl -> BDL
  WHEN LOWER(code) IN ('bdl', 'bundle', 'bundles') OR LOWER(name) ~* '^(bundle|bundles|bdl)$' THEN 'BDL'
  -- Rolls / Rol -> ROL
  WHEN LOWER(code) IN ('rol', 'roll', 'rolls') OR LOWER(name) ~* '^(roll|rolls|rol)$' THEN 'ROL'
  -- Pairs / Prs -> PRS
  WHEN LOWER(code) IN ('prs', 'pair', 'pairs') OR LOWER(name) ~* '^(pair|pairs|prs)$' THEN 'PRS'
  -- Sets / Set -> SET
  WHEN LOWER(code) IN ('set', 'sets') OR LOWER(name) ~* '^(set|sets)$' THEN 'SET'
  -- Quintal / Qtl -> QTL
  WHEN LOWER(code) IN ('qtl', 'quintal', 'quintals') OR LOWER(name) ~* '^(quintal|quintals|qtl)$' THEN 'QTL'
  -- Tonnes / Ton / Mts -> MTS
  WHEN LOWER(code) IN ('mts', 'ton', 'tons', 'tonne', 'tonnes') OR LOWER(name) ~* '^(tonne|tonnes|ton|tons|mts)$' THEN 'MTS'
  -- Litres / Ltr / Klr -> KLR / MLT
  WHEN LOWER(code) IN ('ml', 'mlt', 'millilitre', 'millilitres') OR LOWER(name) ~* '^(millilitre|millilitres|ml|mlt)$' THEN 'MLT'
  WHEN LOWER(code) IN ('klr', 'ltr', 'litre', 'litres', 'liter', 'liters', 'kilolitre') OR LOWER(name) ~* '^(litre|litres|liter|liters|ltr|klr)$' THEN 'KLR'
  -- Default / Miscellaneous / Other -> OTH
  WHEN LOWER(code) IN ('oth', 'other', 'others', 'misc', 'miscellaneous', 'default') OR LOWER(name) ~* '^(other|others|misc|miscellaneous|default)$' THEN 'OTH'
  ELSE COALESCE(uqc, 'OTH')
END
WHERE uqc IS NULL OR uqc = '' OR uqc IN (
  'PCS', 'NOS', 'KGS', 'GMS', 'MTR', 'BOX', 'BAG', 'CTN', 'DOZ', 'BDL', 'ROL', 'PRS', 'SET', 'QTL', 'MTS', 'MLT', 'KLR', 'OTH'
);
