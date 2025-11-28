# Health procedure compliance macro
# Inputs (environment):
#   procId  - identifier of the procedure to check
#
# Behaviour:
#   - Collect all requirements of the form "procId REQUIRES X".
#   - Collect all facts stating "X GIVEN yes" or "X PRESENT yes".
#   - Return TRUE_CERTAIN if every requirement X has at least one such
#     supporting fact; otherwise return FALSE.

@reqs FACTS_MATCHING "$procId REQUIRES ?"
@satGiven FACTS_MATCHING "? GIVEN yes"
@satPresent FACTS_MATCHING "? PRESENT yes"
@allSat MERGE_LISTS $satGiven $satPresent
@result ALL_REQUIREMENTS_SATISFIED $reqs $allSat

