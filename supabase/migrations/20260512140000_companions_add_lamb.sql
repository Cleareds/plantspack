-- Add 'lamb' to the companions.species CHECK constraint.
--
-- We use an explicit DROP+ADD so the constraint name stays stable
-- across redeploys. Re-creating with the same name + a list that
-- contains the prior values means existing rows continue to validate.

alter table public.companions
  drop constraint if exists companions_species_check;

alter table public.companions
  add constraint companions_species_check
  check (species in ('chicken','pig','cow','lamb'));
