# Export action decision macro
# Inputs (environment):
#   actionId - identifier of the export action
#   regs     - array of active regulation identifiers to consider
#
# Behaviour:
#   - Find all facts "actionId PROHIBITED_BY R" and "actionId PERMITTED_BY R".
#   - For the active regs list:
#       * if any regulation both prohibits and permits -> CONFLICT
#       * if any regulation prohibits and none permits -> FALSE
#       * if any regulation permits and none prohibits -> TRUE_CERTAIN
#       * if there are no matching permits or prohibitions -> FALSE

@prohib FACTS_MATCHING "$actionId PROHIBITED_BY ?"
@permit FACTS_MATCHING "$actionId PERMITTED_BY ?"
@result POLARITY_DECIDE $prohib $permit $regs

