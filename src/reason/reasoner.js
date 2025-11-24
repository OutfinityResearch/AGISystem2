class Reasoner {
  constructor(conceptStore) {
    this.conceptStore = conceptStore;
  }

  deduceIsA(subject, object) {
    const facts = this.conceptStore.getFacts();
    const visited = new Set();
    const stack = [subject];
    while (stack.length > 0) {
      const current = stack.pop();
      if (current === object) {
        return { truth: 'TRUE_CERTAIN' };
      }
      if (visited.has(current)) {
        continue;
      }
      visited.add(current);
      for (const fact of facts) {
        if (fact.relation === 'IS_A' && fact.subject === current) {
          stack.push(fact.object);
        }
      }
    }
    return { truth: 'FALSE' };
  }
}

module.exports = Reasoner;

