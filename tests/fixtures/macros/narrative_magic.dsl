# Narrative magic permission macro
# Inputs (environment):
#   actorId - identifier of the character or agent
#   cityId  - identifier of the city/location
#
# Behaviour:
#   - Check that the actor casts Magic.
#   - Check that the actor is located in the given city.
#   - Check that some theory permits magic in that city.
#   - Result is TRUE_CERTAIN only if all three conditions hold; otherwise FALSE.

@casts FACTS_MATCHING $actorId CASTS Magic
@locs FACTS_MATCHING $actorId LOCATED_IN $cityId
@permAll FACTS_WITH_RELATION PERMITS
@permCity FILTER $permAll object=Magic_IN_$cityId
@hasMagic NONEMPTY $casts
@hasLoc NONEMPTY $locs
@perm NONEMPTY $permCity
@both BOOL_AND $hasMagic $hasLoc
@result BOOL_AND $both $perm

