export default [
  {
    id: 'composition-q01', lang: 'both', type: 'concept', difficulty: 1,
    prompt: 'Which pair is correctly modelled: `Car` / `Engine` and `Dog` / `Animal`?',
    options: [
      { text: 'A Car has-an Engine (composition); a Dog is-an Animal (inheritance).', correct: true, why: 'Has-a means the part is a member; is-a means the type can stand in for its base.' },
      { text: 'A Car is-an Engine, and a Dog has-an Animal.', correct: false, why: 'This swaps them: a car is not a kind of engine, and a dog is a kind of animal.' },
      { text: 'Both should use inheritance, since both reuse code.', correct: false, why: 'Code reuse alone is not a reason to inherit; only a true is-a relation is.' },
      { text: 'Both should use composition.', correct: false, why: 'Dog is a true subtype of Animal, which inheritance models directly.' },
    ],
    explanation: `Ask "is X a kind of Y in every situation where a Y is expected?" for inheritance, and "does X have a Y as a part?" for composition. When in doubt, prefer composition: it couples you only to the part's public interface and can be changed at run time.`,
  },
  {
    id: 'composition-q02', lang: 'both', type: 'concept', difficulty: 2,
    prompt: 'How do composition and aggregation differ?',
    options: [
      { text: 'In composition the parts live and die with the whole; in aggregation they can exist independently.', correct: true, why: 'Lifetime ownership is the distinguishing feature.' },
      { text: 'Composition uses inheritance and aggregation does not.', correct: false, why: 'Both are has-a relationships; neither uses inheritance.' },
      { text: 'Aggregation means the whole owns its parts.', correct: false, why: 'That is composition; aggregation is a weaker, non-owning has-a.' },
      { text: 'They are only different names for the same thing.', correct: false, why: 'UML distinguishes them (filled vs hollow diamond) because ownership matters.' },
    ],
    explanation: `A \`Car\` and its \`Engine\` are composed: destroy the car, the engine goes with it. A \`Garage\` and the cars parked in it are aggregated: the cars exist before and after. In C++ the first is a by-value or \`unique_ptr\` member, the second a reference or pointer.`,
  },
  {
    id: 'composition-q03', lang: 'both', type: 'concept', difficulty: 1,
    prompt: 'In a UML class diagram, what does a **filled diamond** on a line mean?',
    options: [
      { text: 'Composition: the class at the diamond end owns the other and controls its lifetime.', correct: true, why: 'Filled diamond = strong ownership.' },
      { text: 'Aggregation: a weak, shared has-a.', correct: false, why: 'Aggregation is a hollow (empty) diamond.' },
      { text: 'Inheritance.', correct: false, why: 'Inheritance is a hollow triangle on the base class.' },
      { text: 'Dependency.', correct: false, why: 'Dependency is a dashed line with an open arrowhead.' },
    ],
    explanation: `Diamonds are at the *whole* end: filled for composition (owns the part), hollow for aggregation (holds it without owning). Triangles mean generalization, and a dashed arrow means "depends on / uses".`,
  },
  {
    id: 'composition-q04', lang: 'both', type: 'concept', difficulty: 1,
    prompt: 'Which UML symbol means "is-a" (generalization)?',
    options: [
      { text: 'A solid line with a hollow triangle pointing at the base class.', correct: true, why: 'The triangle points from the subclass to the superclass.' },
      { text: 'A dashed line with an open arrow.', correct: false, why: 'That is dependency ("uses").' },
      { text: 'A solid line with a filled diamond.', correct: false, why: 'A filled diamond is composition.' },
      { text: 'A line with a hollow diamond.', correct: false, why: 'A hollow diamond is aggregation.' },
    ],
    explanation: `Generalization (inheritance) is drawn with a hollow triangle at the superclass end. Remember: triangle = "is a", diamond = "has a", dashed arrow = "uses".`,
  },
  {
    id: 'composition-q05', lang: 'cpp', type: 'output', difficulty: 2,
    prompt: 'What does this program print?',
    codeLang: 'cpp',
    code: `#include <iostream>
struct Engine {
    ~Engine() { std::cout << "~Engine "; }
};
struct Car {
    Engine e;
    ~Car() { std::cout << "~Car "; }
};
int main() {
    Car c;
}`,
    options: [
      { text: '~Car ~Engine', correct: true, why: 'The destructor body runs first, then members are destroyed.' },
      { text: '~Engine ~Car', correct: false, why: 'The member is destroyed after the owner body, so the owner can still use it while destructing.' },
      { text: '~Car', correct: false, why: 'Members are destroyed automatically, so ~Engine also prints.' },
      { text: '~Engine', correct: false, why: 'Car\'s destructor still runs, and prints first.' },
    ],
    explanation: `Destruction mirrors construction: the destructor body runs first, then data members are destroyed in reverse declaration order, then bases. Because the member outlives the destructor body, \`~Car\` can safely use \`e\`. This automatic cleanup is what makes composition by value so safe.`,
  },
  {
    id: 'composition-q06', lang: 'python', type: 'output', difficulty: 3,
    prompt: 'What does this program print?',
    codeLang: 'python',
    code: `class Proxy:
    def __init__(self, target):
        self._target = target
    def __getattr__(self, name):
        return getattr(self._target, name)

p = Proxy([1, 2, 3])
print(p.count(1))
try:
    print(len(p))
except TypeError:
    print("TypeError")`,
    options: [
      { text: '1\nTypeError', correct: true, why: 'count is forwarded by __getattr__, but len() looks up __len__ on the type, bypassing it.' },
      { text: '1\n3', correct: false, why: 'Special methods are looked up on the class, so __getattr__ never supplies __len__.' },
      { text: 'TypeError\nTypeError', correct: false, why: 'Ordinary methods like count are found through __getattr__ and work.' },
      { text: '1', correct: false, why: 'The len(p) line still runs and prints "TypeError" from the except block.' },
    ],
    explanation: `Implicit special-method calls (\`len(x)\`, \`x[0]\`, \`for ... in x\`, \`x + y\`) are looked up on \`type(x)\`, not on the instance, and skip \`__getattr__\`. A delegating wrapper must define the special methods it wants to forward, which is part of the boilerplate cost of composition.`,
  },
  {
    id: 'composition-q07', lang: 'both', type: 'concept', difficulty: 2,
    prompt: 'What advantage does a composed strategy (e.g. a `discount` member) have over a subclass-per-behavior design?',
    options: [
      { text: 'The behavior can be replaced at run time on an existing object.', correct: true, why: 'A member can be reassigned; a class\'s base is fixed when it is written.' },
      { text: 'It runs faster than a subclass.', correct: false, why: 'Speed is not the point; dynamic dispatch through a member is not faster.' },
      { text: 'It avoids having to define the behavior at all.', correct: false, why: 'Each strategy still has to be implemented.' },
      { text: 'It requires the strategy to inherit from the owner.', correct: false, why: 'Strategies are independent of the owner and only share an interface.' },
    ],
    explanation: `With inheritance the behavior is baked into the type at compile time. With a composed strategy (a pointer to an interface in C++, a callable or object in Python) you can call \`setDiscount(...)\` while the program runs, and combine strategies freely without creating a new subclass for each combination.`,
  },
  {
    id: 'composition-q08', lang: 'both', type: 'bug', difficulty: 3,
    prompt: 'Why does `Square : Rectangle` break this code?',
    codeLang: 'cpp',
    code: `void stretch(Rectangle& r) {
    r.setWidth(10);
    // caller assumes: height unchanged, area == 10 * oldHeight
}
// Square::setWidth sets both width and height to the value.`,
    options: [
      { text: 'A Square cannot honor Rectangle\'s contract (width and height vary independently), so substituting it changes the caller\'s results.', correct: true, why: 'This is a Liskov Substitution violation: behavior, not signature, differs.' },
      { text: 'Square has the wrong constructor signature.', correct: false, why: 'The code compiles; the problem is behavioral.' },
      { text: 'Virtual functions cannot be overridden in this case.', correct: false, why: 'The override works, which is exactly what causes the surprise.' },
      { text: 'Rectangle should be abstract.', correct: false, why: 'Making it abstract does not fix the mismatched contract.' },
    ],
    explanation: `Mathematically a square is a rectangle, but a *mutable* square is not a substitutable mutable rectangle: a rectangle promises that changing the width leaves the height alone. Fixes: immutable shapes with \`with_width\`, a common \`Shape\` interface with no setters, or no inheritance between them.`,
  },
  {
    id: 'composition-q09', lang: 'both', type: 'concept', difficulty: 2,
    prompt: 'What does the Liskov Substitution Principle require?',
    options: [
      { text: 'Objects of a subtype must be usable wherever the base type is expected without breaking the program\'s correctness.', correct: true, why: 'Substitutability means the subtype keeps the base class\'s promised behavior.' },
      { text: 'A subclass must have the same method names as its base.', correct: false, why: 'Matching names is necessary but not sufficient; behavior must match too.' },
      { text: 'A subclass may not add any new methods.', correct: false, why: 'Adding methods is fine; changing promised behavior is not.' },
      { text: 'Every class must have a base class.', correct: false, why: 'LSP is about when inheritance is valid, not a requirement to use it.' },
    ],
    explanation: `A subtype may accept more (weaker preconditions) and promise more (stronger postconditions), and must preserve the base class's invariants. If code written against the base would need \`if (isSquare)\` checks, the hierarchy violates LSP.`,
  },
  {
    id: 'composition-q10', lang: 'both', type: 'compare', difficulty: 2,
    prompt: 'How does C++ "owning member" compare with Python object references for composition?',
    options: [
      { text: 'C++ states ownership in the type (value or unique_ptr member vs reference/pointer); Python has only references and ownership is a convention.', correct: true, why: 'Python frees objects when unreferenced; nothing in the syntax says who owns what.' },
      { text: 'Python members are always owned by value.', correct: false, why: 'Python attributes are references to heap objects, and they may be shared.' },
      { text: 'C++ composition must use raw pointers.', correct: false, why: 'Values and unique_ptr are the preferred owning members.' },
      { text: 'Neither language distinguishes aggregation from composition.', correct: false, why: 'C++ types express it; Python relies on documentation and design.' },
    ],
    explanation: `In C++ a \`Engine\` member is *inside* the \`Car\` and dies with it, while an \`Engine&\` member means someone else owns it. In Python \`self.engine = e\` just binds a name, so another variable may keep the engine alive. Document the intent and avoid sharing parts you meant to own.`,
  },
  {
    id: 'composition-q11', lang: 'both', type: 'concept', difficulty: 2,
    prompt: 'What is a "class explosion", and how does composition help?',
    options: [
      { text: 'One subclass per feature combination (e.g. BorderedScrollableWindow); composing independent feature objects needs only one class per feature.', correct: true, why: 'N features cost N classes by composition but up to 2^N subclasses by inheritance.' },
      { text: 'A class with too many methods; composition removes methods.', correct: false, why: 'That is a "god class"; class explosion is about the number of subclasses.' },
      { text: 'Exceptions thrown from a destructor.', correct: false, why: 'Unrelated to the class design issue.' },
      { text: 'A subclass that overrides every method.', correct: false, why: 'The term is about combinatorial growth of types.' },
    ],
    explanation: `Inheritance is one-dimensional: each combination of behaviors needs its own subclass. Composition lets a \`Window\` hold a list of \`Feature\` objects, so 3 features give 8 combinations from 3 small classes, and new features multiply nothing.`,
  },
  {
    id: 'composition-q12', lang: 'cpp', type: 'concept', difficulty: 2,
    prompt: 'A `Garage` stores `Car*` pointers to cars owned elsewhere (aggregation). When the `Garage` is destroyed, what happens to the cars?',
    options: [
      { text: 'Nothing: they live on, because the Garage never owned them.', correct: true, why: 'A raw pointer member does not delete its target; destroying the pointer only discards the address.' },
      { text: 'The cars are destroyed automatically.', correct: false, why: 'Only members that own their objects (by value, unique_ptr) destroy them.' },
      { text: 'The program crashes.', correct: false, why: 'Nothing invalid happens; the pointers just go away.' },
      { text: 'The cars are copied into the destructor.', correct: false, why: 'No copies are made; the destructor does not touch them.' },
    ],
    explanation: `A pointer or reference member expresses a *non-owning* relationship: the pointed-to object has its own lifetime. The danger is the reverse case, where the car is destroyed first and the garage keeps a **dangling** pointer. The owner must outlive every non-owning user.`,
  },
  {
    id: 'composition-q13', lang: 'both', type: 'concept', difficulty: 2,
    prompt: 'What is the main cost of composition and delegation?',
    options: [
      { text: 'Forwarding boilerplate: every method you want to expose must be written to call the part.', correct: true, why: 'Inheritance gets the base interface for free; composition requires explicit forwarding.' },
      { text: 'Objects become slower to construct than any inheritance-based design.', correct: false, why: 'Construction cost is comparable; the real cost is code you write.' },
      { text: 'You cannot test the parts separately.', correct: false, why: 'Composition makes parts easier to test and replace.' },
      { text: 'You lose encapsulation.', correct: false, why: 'Composition keeps the part private, strengthening encapsulation.' },
    ],
    explanation: `If \`Car\` wants to offer \`start()\`, it writes \`start() { return engine_.start(); }\`. That repetition is the price of exposing only what you choose. Languages and tools reduce it (Python's \`__getattr__\`, Kotlin's \`by\` delegation), but with limitations.`,
  },
  {
    id: 'composition-q14', lang: 'both', type: 'concept', difficulty: 1,
    prompt: 'In UML, what does the multiplicity `1..*` mean at one end of an association?',
    options: [
      { text: 'One or more objects.', correct: true, why: '1 is the lower bound and * means unbounded.' },
      { text: 'Exactly one object.', correct: false, why: 'Exactly one is written as plain 1.' },
      { text: 'Zero or more objects.', correct: false, why: 'Zero or more is 0..* (or just *).' },
      { text: 'Between one and nine objects.', correct: false, why: 'The star means no upper limit, not a digit.' },
    ],
    explanation: `Multiplicity gives the lower and upper number of instances: \`1\`, \`0..1\` (optional), \`0..*\` or \`*\` (any number), \`1..*\` (at least one). For example, an \`Order\` has \`1..*\` \`Line\` items.`,
  },
  {
    id: 'composition-q15', lang: 'python', type: 'output', difficulty: 2,
    prompt: 'What does this program print?',
    codeLang: 'python',
    code: `class Stack:
    def __init__(self):
        self._items = []
    def push(self, x):
        self._items.append(x)

s = Stack()
print(hasattr(s, "insert"), hasattr(s, "push"))`,
    options: [
      { text: 'False True', correct: true, why: 'The Stack has its own push but does not expose the list\'s insert.' },
      { text: 'True True', correct: false, why: 'insert would exist only if Stack inherited from list.' },
      { text: 'False False', correct: false, why: 'push is defined on Stack, so hasattr is true for it.' },
      { text: 'True False', correct: false, why: 'This is backwards: push exists and insert does not.' },
    ],
    explanation: `Because \`Stack\` *has* a list rather than *being* one, only the methods you define are available. A stack that inherited from \`list\` would also allow \`insert\`, \`sort\` and \`__setitem__\`, violating the stack's invariants. That narrow interface is the point of composition.`,
  },
];
