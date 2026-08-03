-- Backfill demo room floor plan positions for STAY tenant
UPDATE stay_rooms SET position_x = 50, position_y = 50
WHERE tenant_id = 'b1111111-2222-4333-8444-555555555501'::uuid AND number = '101';

UPDATE stay_rooms SET position_x = 200, position_y = 50
WHERE tenant_id = 'b1111111-2222-4333-8444-555555555501'::uuid AND number = '102';

UPDATE stay_rooms SET position_x = 50, position_y = 230
WHERE tenant_id = 'b1111111-2222-4333-8444-555555555501'::uuid AND number = '201';

UPDATE stay_rooms SET position_x = 200, position_y = 230
WHERE tenant_id = 'b1111111-2222-4333-8444-555555555501'::uuid AND number = '202';
