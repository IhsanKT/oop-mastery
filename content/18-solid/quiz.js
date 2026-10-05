export default [
  {
    id: 'solid-q01', lang: 'both', type: 'concept', difficulty: 1,
    prompt: 'What does the Single Responsibility Principle actually say?',
    options: [
      { text: 'A class should have only one reason to change.', correct: true, why: 'Correct: a responsibility is an axis of change, usually tied to one stakeholder or concern.' },
      { text: 'A class should have only one method.', correct: false, why: 'Misconception: SRP is about reasons to change, not the number of methods; cohesive classes often have many.' },
      { text: 'A class should have only one data member.', correct: false, why: 'Member count is irrelevant; a Point with x and y has a single responsibility.' },
      { text: 'A class should be used from only one place.', correct: false, why: 'Reuse is a goal of good design; SRP says nothing about how many callers a class has.' },
    ],
    explanation: `SRP says a class should have **one reason to change**. If the report layout, the storage medium and the mail server can each force an edit to the same class, it has three responsibilities. Splitting them means each change touches one small class and cannot break the others.`,
  },
  {
    id: 'solid-q02', lang: 'python', type: 'concept', difficulty: 1,
    prompt: 'Which class violates SRP?',
    codeLang: 'python',
    code: `class Invoice:
    def __init__(self, items): self.items = items
    def total(self): return sum(i.price for i in self.items)

class User:
    def __init__(self, name, email): self.name, self.email = name, email
    def validate_email(self): ...
    def save_to_database(self): ...
    def render_profile_html(self): ...`,
    options: [
      { text: 'User: it mixes validation, persistence and presentation.', correct: true, why: 'Correct: a database change, a validation rule change and an HTML change all edit User.' },
      { text: 'Invoice: it computes a total.', correct: false, why: 'Computing a total from its own items is the one cohesive job Invoice has.' },
      { text: 'Both: any class with methods violates SRP.', correct: false, why: 'Methods are fine; the problem is unrelated reasons to change, not having behaviour.' },
      { text: 'Neither: both classes are small.', correct: false, why: 'Size is not the test; User has three distinct reasons to change regardless of line count.' },
    ],
    explanation: `\`User\` bundles three concerns: business rules (validation), infrastructure (persistence) and presentation (HTML). Each belongs in its own collaborator such as \`EmailValidator\`, \`UserRepository\` and \`ProfileRenderer\`. \`Invoice\` stays focused on its own data.`,
  },
  {
    id: 'solid-q03', lang: 'both', type: 'concept', difficulty: 1,
    prompt: 'What does the Open/Closed Principle ask for?',
    options: [
      { text: 'Add new behaviour by writing new code, without editing existing tested code.', correct: true, why: 'Correct: extension points such as polymorphism let new variants plug in unchanged callers.' },
      { text: 'Never modify any class once it is written.', correct: false, why: 'Bug fixes and refactors are still allowed; OCP is about adding variants, not freezing code.' },
      { text: 'Keep all data members public so classes stay open.', correct: false, why: 'Openness refers to extension of behaviour, not to access control; this breaks encapsulation.' },
      { text: 'Use inheritance everywhere.', correct: false, why: 'Inheritance is one extension mechanism, but overuse causes fragile hierarchies; composition also works.' },
    ],
    explanation: `A module is **open for extension** (you can add behaviour) and **closed for modification** (existing, tested code does not change). Polymorphism achieves this: callers depend on an abstraction, so adding a new implementation never touches them.`,
  },
  {
    id: 'solid-q04', lang: 'python', type: 'output', difficulty: 2,
    prompt: 'A new discount class is added. What does this program print?',
    codeLang: 'python',
    code: `class Calculator:
    def total(self, amount, policy):
        return policy.apply(amount)

class NoDiscount:
    def apply(self, amount): return amount

class StudentDiscount:
    def apply(self, amount): return amount * 0.8

calc = Calculator()
print(calc.total(100, NoDiscount()))
print(calc.total(100, StudentDiscount()))`,
    options: [
      { text: '100\n80.0', correct: true, why: 'Correct: the int 100 is returned unchanged, and 100 * 0.8 is the float 80.0.' },
      { text: '100\n80', correct: false, why: 'Multiplying by the float 0.8 yields a float, which prints as 80.0, not 80.' },
      { text: '100\n100', correct: false, why: 'The calculator delegates to the policy it was given, so StudentDiscount does apply.' },
      { text: 'AttributeError', correct: false, why: 'Duck typing only needs an apply method; no base class or registration is required.' },
    ],
    explanation: `\`Calculator\` never changed when \`StudentDiscount\` was added: it only calls \`policy.apply\`. That is OCP in Python, where duck typing replaces an explicit interface. Note \`100 * 0.8\` is a float, so it prints \`80.0\`.`,
  },
  {
    id: 'solid-q05', lang: 'both', type: 'bug', difficulty: 2,
    prompt: 'Which design violates the Liskov Substitution Principle?',
    options: [
      { text: 'Penguin extends Bird, and Penguin.fly() throws "cannot fly" while Bird.fly() works.', correct: true, why: 'Correct: code written for any Bird that calls fly() now fails for a Penguin.' },
      { text: 'Dog extends Animal and overrides speak() to bark.', correct: false, why: 'Overriding to specialise behaviour within the same contract is exactly what LSP allows.' },
      { text: 'ArrayStack and LinkedStack both implement Stack.', correct: false, why: 'Different implementations of one contract are the purpose of an interface, not a violation.' },
      { text: 'A subclass adds a new method the base does not have.', correct: false, why: 'Adding capabilities is safe; LSP is violated by removing or contradicting promises.' },
    ],
    explanation: `LSP: anywhere a base type is expected, a subtype must work **without surprises**. A \`Penguin\` that throws from \`fly()\` weakens the base promise. The fix is to model the capability separately (for example a \`FlyingBird\` type) instead of inheriting something you cannot honour.`,
  },
  {
    id: 'solid-q06', lang: 'python', type: 'output', difficulty: 2,
    prompt: 'What does this program print?',
    codeLang: 'python',
    code: `class Bird:
    def fly(self): return "flap"

class Penguin(Bird):
    def fly(self): raise NotImplementedError("penguins cannot fly")

def migrate(bird):
    return bird.fly()

for b in (Bird(), Penguin()):
    try:
        print(migrate(b))
    except NotImplementedError as e:
        print("error:", e)`,
    options: [
      { text: 'flap\nerror: penguins cannot fly', correct: true, why: 'Correct: the Bird works, the Penguin breaks the contract migrate() relied on.' },
      { text: 'flap\nflap', correct: false, why: 'Penguin overrides fly(), so its version runs, not the inherited one.' },
      { text: 'flap', correct: false, why: 'The exception is caught inside the loop, so the loop continues and prints the error line.' },
      { text: 'error: penguins cannot fly', correct: false, why: 'The first item is a plain Bird, whose fly() succeeds and prints flap first.' },
    ],
    explanation: `\`migrate\` is written against \`Bird\`, yet it fails for a \`Penguin\`: the substitution is **not** safe, which is the definition of an LSP violation. The try/except in the client is a smell too, since callers must now know about special subtypes.`,
  },
  {
    id: 'solid-q07', lang: 'both', type: 'concept', difficulty: 2,
    prompt: 'A `Worker` interface has `work()` and `eat()`. `Robot` must implement both. Which principle does this break and what is the fix?',
    options: [
      { text: 'Interface Segregation: split into Workable and Eatable and implement only what applies.', correct: true, why: 'Correct: clients (and Robot) should not be forced to depend on methods they do not use.' },
      { text: 'Single Responsibility: merge Robot into Worker.', correct: false, why: 'Merging increases coupling; the issue is a fat interface, not a class doing too much.' },
      { text: 'Open/Closed: make eat() virtual.', correct: false, why: 'It already is polymorphic; being virtual does not stop robots being forced to implement it.' },
      { text: 'None: Robot can simply throw from eat().', correct: false, why: 'Throwing from a forced method is a lie in the contract and also violates LSP.' },
    ],
    explanation: `ISP says many small, role-specific interfaces are better than one general-purpose one. Robots implement \`Workable\`; humans implement \`Workable\` and \`Eatable\`. Code that only needs work can accept a \`Workable\` and never learns about eating.`,
  },
  {
    id: 'solid-q08', lang: 'both', type: 'concept', difficulty: 2,
    prompt: 'What does the Dependency Inversion Principle say?',
    options: [
      { text: 'High-level modules and low-level details should both depend on abstractions.', correct: true, why: 'Correct: the policy code defines the interface it needs and details implement it.' },
      { text: 'High-level modules should depend directly on low-level modules for speed.', correct: false, why: 'That is the non-inverted design DIP argues against; it hard-wires policy to details.' },
      { text: 'Dependencies should be removed entirely.', correct: false, why: 'Classes always collaborate; DIP controls the direction and type of the dependency, not its existence.' },
      { text: 'Every class must have a global singleton instance.', correct: false, why: 'Singletons are hidden concrete dependencies, the opposite of inversion.' },
    ],
    explanation: `Instead of \`OrderService -> MySqlDatabase\`, you get \`OrderService -> Repository <- MySqlDatabase\`. The arrow from the detail now points **up** at the abstraction, hence "inversion". The service becomes reusable and testable.`,
  },
  {
    id: 'solid-q09', lang: 'cpp', type: 'output', difficulty: 2,
    prompt: 'A fake repository is injected into the service. What does this program print?',
    codeLang: 'cpp',
    code: `#include <iostream>
#include <string>
#include <vector>

struct Order { std::string item; };

struct Repository {
    virtual void save(const Order&) = 0;
    virtual ~Repository() = default;
};
struct FakeRepo : Repository {
    std::vector<Order> orders;
    void save(const Order& o) override { orders.push_back(o); }
};

class OrderService {
    Repository& repo_;
public:
    explicit OrderService(Repository& r) : repo_(r) {}
    void place(const Order& o) { repo_.save(o); }
};

int main() {
    FakeRepo fake;
    OrderService service(fake);
    service.place({"book"});
    std::cout << "saved " << fake.orders.size() << " order\\n";
}`,
    options: [
      { text: 'saved 1 order', correct: true, why: 'Correct: the service called save on the injected fake, which stored one order.' },
      { text: 'saved 0 order', correct: false, why: 'The service holds a reference to the same fake, so its save does reach fake.orders.' },
      { text: 'saved 1 orders', correct: false, why: 'The program prints the literal text " order"; no plural is added.' },
      { text: 'compile error: Repository is abstract', correct: false, why: 'Only instantiating the abstract type is an error; a reference to it is fine.' },
    ],
    explanation: `Constructor injection lets the test pass a \`FakeRepo\` in place of a real database. Because \`OrderService\` depends on the abstract \`Repository\`, the test needs no database and can inspect the fake afterwards.`,
  },
  {
    id: 'solid-q10', lang: 'both', type: 'compare', difficulty: 2,
    prompt: 'How is dependency inversion expressed in C++ versus Python?',
    options: [
      { text: 'C++ uses abstract classes with virtual functions (or templates); Python can use ABCs, Protocols or plain duck typing.', correct: true, why: 'Correct: both express an abstraction, but Python needs no declared relationship.' },
      { text: 'Only C++ supports DIP; Python cannot because it has no interfaces.', correct: false, why: 'Python supports DIP through duck typing, ABCs and typing.Protocol.' },
      { text: 'Only Python supports DIP; C++ has no interfaces.', correct: false, why: 'C++ interfaces are abstract classes with pure virtual functions.' },
      { text: 'Both require a DI framework.', correct: false, why: 'Manual constructor injection works well in both languages; frameworks are optional.' },
    ],
    explanation: `C++ is statically typed, so the abstraction is a declared abstract class (or a template parameter/concept). Python's \`typing.Protocol\` gives static checkers a structural interface without inheritance, and at runtime any object with the right methods works.`,
  },
  {
    id: 'solid-q11', lang: 'cpp', type: 'bug', difficulty: 2,
    prompt: 'Adding a `Triangle` forces edits to this function and to several others like it. Which principle is violated and what is the fix?',
    codeLang: 'cpp',
    code: `double area(const Shape& s) {
    switch (s.kind) {
        case Kind::Circle: return 3.14159 * s.r * s.r;
        case Kind::Rect:   return s.w * s.h;
    }
    return 0;
}`,
    options: [
      { text: 'Open/Closed: give Shape a virtual area() and let each shape implement it.', correct: true, why: 'Correct: new shapes then add a class instead of editing every switch.' },
      { text: 'Single Responsibility: move the switch into a Shape constructor.', correct: false, why: 'Moving the switch changes nothing about needing to edit it for every new kind.' },
      { text: 'Interface Segregation: split area() into two switches.', correct: false, why: 'More switches mean more places to edit; the problem is the type tag, not interface size.' },
      { text: 'No violation: switches are the standard way in C++.', correct: false, why: 'Switches on a type tag are exactly the smell OCP highlights.' },
    ],
    explanation: `A \`switch\` on a type tag scatters knowledge of each kind across the program. With a virtual \`area()\` each shape owns its formula, and \`area(const Shape&)\` becomes \`return s.area();\` and never changes again.`,
  },
  {
    id: 'solid-q12', lang: 'both', type: 'concept', difficulty: 2,
    prompt: 'What is the main benefit of constructor injection?',
    options: [
      { text: 'Dependencies are explicit, can be swapped (e.g. fakes in tests) and the object is never half-built.', correct: true, why: 'Correct: required collaborators are visible in the signature and set once.' },
      { text: 'It makes the program run faster.', correct: false, why: 'Injection is about design and testing, not runtime speed.' },
      { text: 'It removes the need for interfaces.', correct: false, why: 'Injection works best with abstractions; without them you only move a concrete dependency.' },
      { text: 'It lets the object change its dependencies at any time.', correct: false, why: 'That describes setter injection; constructor injection typically fixes them for the lifetime.' },
    ],
    explanation: `With constructor injection the class **declares** what it needs and receives it from outside. Tests pass fakes, production code passes real implementations, and the object is fully usable as soon as it exists.`,
  },
  {
    id: 'solid-q13', lang: 'python', type: 'concept', difficulty: 3,
    prompt: 'A subclass overrides a method with `raise NotImplementedError`. What does this usually signal?',
    options: [
      { text: 'An LSP (and often ISP) violation: the subtype cannot honour the base contract.', correct: true, why: 'Correct: callers using the base type are surprised by a failure the contract never mentioned.' },
      { text: 'A correct use of abstraction.', correct: false, why: 'Raising it in the base class marks an abstract hook; raising it in an override removes capability.' },
      { text: 'An SRP violation in the base class only.', correct: false, why: 'The issue is the subtype refusing a promise, which is substitutability, not one-reason-to-change.' },
      { text: 'A DIP violation because exceptions are concrete.', correct: false, why: 'DIP is about dependency direction; exception types do not cause this smell.' },
    ],
    explanation: `An override that refuses to work tells you the inheritance relationship is wrong or the base interface is too fat. Split the interface (ISP) or stop inheriting (LSP). The abstract-hook use of \`NotImplementedError\` belongs in the **base** class only.`,
  },
  {
    id: 'solid-q14', lang: 'both', type: 'concept', difficulty: 3,
    prompt: 'A teammate adds an interface, a factory and a registry for a class that has exactly one implementation and one caller. What is the risk?',
    options: [
      { text: 'Over-engineering: extra indirection and complexity with no present benefit (YAGNI).', correct: true, why: 'Correct: abstractions have a cost and should answer a real change or test need.' },
      { text: 'None: more abstraction is always better SOLID.', correct: false, why: 'SOLID is a set of heuristics; applying them without a force to resolve adds only complexity.' },
      { text: 'It violates LSP by definition.', correct: false, why: 'LSP concerns subtypes, and with only one implementation there is no substitution problem.' },
      { text: 'It will make the code compile slower, and that is the only issue.', correct: false, why: 'Build time is minor; the real cost is cognitive load and harder maintenance.' },
    ],
    explanation: `Add an abstraction when you have a second variant, a need for a test double, or a dependency you must isolate. Until then the simplest code is easier to read and cheaper to change. Refactor towards SOLID when change actually hurts.`,
  },
  {
    id: 'solid-q15', lang: 'both', type: 'compare', difficulty: 3,
    prompt: 'How does SRP differ from "a function should do one thing"?',
    options: [
      { text: 'SRP is about reasons to change at the class/module level; "one thing" is about the granularity of a function.', correct: true, why: 'Correct: they are different scales of cohesion; SRP groups behaviour by who or what drives change.' },
      { text: 'They are identical rules at different names.', correct: false, why: 'A class with many one-thing functions can still serve several unrelated stakeholders.' },
      { text: 'SRP means each class has a single public method.', correct: false, why: 'That conflates responsibility with method count; a Stack has push, pop and peek.' },
      { text: 'SRP applies only to functions, not to classes.', correct: false, why: 'SRP is explicitly about classes and modules.' },
    ],
    explanation: `"Do one thing" keeps a function readable. SRP asks a different question about a **class**: how many independent forces could make it change? A class of tidy single-purpose functions can still mix persistence, formatting and business rules.`,
  },
];
