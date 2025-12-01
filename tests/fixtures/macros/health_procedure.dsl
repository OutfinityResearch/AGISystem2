# Health procedure compliance macro
# Inputs (environment):
#   procId  - identifier of the procedure to check
#
# Behaviour:
#   - Collect all requirements of the form "procId REQUIRES X".
#   - Collect all facts with GIVEN relation, filter for object=yes.
#   - Collect all facts with PRESENT relation, filter for object=yes.
#   - Return TRUE_CERTAIN if every requirement X has at least one such
#     supporting fact; otherwise return FALSE.

@reqs FACTS_MATCHING $procId REQUIRES
@givenAll FACTS_WITH_RELATION GIVEN
@satGiven FILTER $givenAll object=yes
@presentAll FACTS_WITH_RELATION PRESENT
@satPresent FILTER $presentAll object=yes
@allSat MERGE_LISTS $satGiven $satPresent
@result ALL_REQUIREMENTS_SATISFIED $reqs $allSat

