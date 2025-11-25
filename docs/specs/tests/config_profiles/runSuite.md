# Suite: config_profiles

ID: DS(/tests/config_profiles/runSuite)

Scope: `Config` profiles and validation.

Fixtures: `data/init/config_profile.json` (optional).

Profile: runs all three profiles.

Assertions:
- `auto_test`: dims=512; recursion=2; partitions fixed 0–255/256–383; strategy simhash; persistence memory.
- `manual_test`: dims=1024; recursion=3; LSH p-stable 32/8/8; file_binary root `./.data_dev`.
- `prod`: dims=2048; recursion=3; LSH p-stable 64/16/6; file_binary root set; partitions fixed.
- Invalid configs (dimensions<512, bad strategy) throw.

Sample:
- Load `auto_test` profile → `getPartition('ontology')` returns {0,255}, strategy simhash.***
