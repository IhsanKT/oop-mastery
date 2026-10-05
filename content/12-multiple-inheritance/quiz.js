export default [
  {
    id: 'multiple-inheritance-q01', lang: 'both', type: 'concept', difficulty: 1,
    prompt: 'Which situation is the best fit for multiple inheritance?',
    options: [
      { text: 'A class that must satisfy several independent, abstract interfaces, such as `Printable` and `Serializable`.', correct: true, why: 'Right. Interfaces carry no data or implementation, so combining them cannot create conflicts.' },
      { text: 'Reusing code from two large concrete classes that both hold state and define `init()`.', correct: false, why: 'Two stateful bases are the classic recipe for ambiguity and diamonds; composition is safer.' },
      { text: 'Saving typing whenever two classes share a few lines of code.', correct: false, why: 'Sharing a few lines is no reason for an is-a relationship; use a helper function or composition.' },
      { text: 'Making sure every class has exactly one parent.', correct: false, why: 'That describes single inheritance, the opposite of the question.' },
    ],
    explanation: `Multiple inheritance is safest when the extra bases are **pure interfaces** (abstract methods, no data) or small mixins. Combining several concrete, stateful bases creates name clashes and diamonds, so prefer interfaces plus composition there.`,
  },
  {
    id: 'multiple-inheritance-q02', lang: 'cpp', type: 'bug', difficulty: 1,
    prompt: 'This code does not compile at the marked line. Why?',
    codeLang: 'cpp',
    code: `struct A { void f() {} };
struct B { void f() {} };
struct C : A, B {};

int main() {
    C c;
    c.f();   // error
}`,
    options: [
      { text: '`f` is found in both bases, so the call is ambiguous. Qualify it (`c.A::f()`) or define `C::f`.', correct: true, why: 'Right. C++ does not pick a winner between unrelated bases; it rejects the name lookup.' },
      { text: 'A class cannot inherit from two structs.', correct: false, why: 'Multiple inheritance is legal; the error is only about the name `f`.' },
      { text: '`f` must be `virtual` in both bases.', correct: false, why: '`virtual` is about run-time dispatch; it does not resolve a name found in two bases.' },
      { text: 'The leftmost base wins, but `C` forgot to declare `using A::f`.', correct: false, why: 'C++ has no leftmost-wins rule (that is Python). Ambiguity is simply an error.' },
    ],
    explanation: `Name lookup finds \`f\` in two unrelated base-class scopes and cannot decide. You can qualify the call (\`c.A::f()\`), add \`using A::f;\` to \`C\` to pick one, or define \`void f()\` in \`C\` that calls whichever combination is meant.`,
  },
  {
    id: 'multiple-inheritance-q03', lang: 'cpp', type: 'output', difficulty: 2,
    prompt: 'What does this program print?',
    codeLang: 'cpp',
    code: `#include <iostream>

struct A { A() { std::cout << "A "; } };
struct B : A { B() { std::cout << "B "; } };
struct C : A { C() { std::cout << "C "; } };
struct D : B, C { D() { std::cout << "D "; } };

int main() {
    D d;
    std::cout << "\\n";
}`,
    options: [
      { text: 'A B A C D', correct: true, why: '`D` contains two separate `A` subobjects: one built for `B` and one for `C`.' },
      { text: 'A B C D', correct: false, why: 'That output needs `virtual` inheritance of `A`; without it each path builds its own `A`.' },
      { text: 'D B C A', correct: false, why: 'Bases are constructed before the derived constructor body, so `D` prints last.' },
      { text: 'A A B C D', correct: false, why: 'Each base subobject is constructed immediately before its derived part: `A` then `B`, `A` then `C`.' },
    ],
    explanation: `\`D\` derives from \`B\` and \`C\`, and each derives from \`A\`, so \`D\` has two \`A\` subobjects (the "diamond" without \`virtual\`). Construction goes base-first in the order the bases are listed: \`A\`, \`B\`, \`A\`, \`C\`, then \`D\`'s body. Accessing an \`A\` member through \`D\` is ambiguous.`,
  },
  {
    id: 'multiple-inheritance-q04', lang: 'cpp', type: 'concept', difficulty: 2,
    prompt: 'The same diamond now uses `virtual` inheritance. What does it print?',
    codeLang: 'cpp',
    code: `struct A { A() { std::cout << "A "; } };
struct B : virtual A { B() { std::cout << "B "; } };
struct C : virtual A { C() { std::cout << "C "; } };
struct D : B, C { D() { std::cout << "D "; } };
// D d;`,
    options: [
      { text: 'A B C D: `A` is constructed once and shared.', correct: true, why: 'Right. `virtual` makes `B` and `C` share one `A`, which is constructed first.' },
      { text: 'A B A C D: `virtual` only changes name lookup.', correct: false, why: '`virtual` inheritance changes the object layout: there is only one `A` subobject.' },
      { text: 'B C A D: virtual bases are built last.', correct: false, why: 'Virtual bases are constructed first, before non-virtual bases.' },
      { text: 'It does not compile: a class cannot have two virtual bases.', correct: false, why: 'Any number of bases may be virtual; this is the standard solution to the diamond.' },
    ],
    explanation: `With \`virtual\` inheritance there is a single \`A\` subobject shared by \`B\` and \`C\`. Virtual bases are constructed first, by the most-derived class (\`D\`), then \`B\`, \`C\`, and \`D\`'s body.`,
  },
  {
    id: 'multiple-inheritance-q05', lang: 'cpp', type: 'concept', difficulty: 3,
    prompt: 'In the virtual diamond, `A` has only a constructor `A(int)`. Which class\'s constructor must call `A(int)` when you create a `D`?',
    options: [
      { text: '`D`, the most-derived class, initializes the virtual base `A` directly; the `A(...)` calls in `B` and `C` are ignored.', correct: true, why: 'Right. Otherwise `B` and `C` could disagree on how to build the one shared `A`.' },
      { text: '`B`, because it is listed first.', correct: false, why: 'The order of bases does not decide who initializes a virtual base.' },
      { text: 'Both `B` and `C`, and the compiler runs whichever is first.', correct: false, why: 'They are both ignored when a `D` is built; only the most-derived class counts.' },
      { text: 'No one: virtual bases are default-initialized.', correct: false, why: 'Without a default constructor, `D` must supply the arguments, or the program does not compile.' },
    ],
    explanation: `Because a virtual base exists only once, C++ lets the **most-derived class** decide how to construct it. If \`A\` has no default constructor, every class that could be most-derived (\`D\` here) must mention \`A(...)\` in its initializer list. When \`B\` or \`C\` are built alone, their own \`A(...)\` calls apply.`,
  },
  {
    id: 'multiple-inheritance-q06', lang: 'python', type: 'output', difficulty: 2,
    prompt: 'What does this program print?',
    codeLang: 'python',
    code: `class A: pass
class B(A): pass
class C(A): pass
class D(B, C): pass

print([c.__name__ for c in D.__mro__])`,
    options: [
      { text: "['D', 'B', 'C', 'A', 'object']", correct: true, why: 'C3 keeps `B` before `C` (as listed) and puts the shared base `A` after both.' },
      { text: "['D', 'B', 'A', 'C', 'object']", correct: false, why: 'This depth-first order would put `A` before `C`, which C3 forbids because `C` is a subclass of `A`.' },
      { text: "['D', 'C', 'B', 'A', 'object']", correct: false, why: 'The order in which the bases are written is preserved, so `B` precedes `C`.' },
      { text: "['D', 'B', 'C', 'A']", correct: false, why: 'Every class ends with `object` in its MRO.' },
    ],
    explanation: `The MRO is computed by C3 linearization: \`L[D] = D + merge(L[B], L[C], [B, C])\`. A class always appears before its bases and the left-to-right order of the bases is preserved, so the common base \`A\` comes after both \`B\` and \`C\`, followed by \`object\`.`,
  },
  {
    id: 'multiple-inheritance-q07', lang: 'python', type: 'output', difficulty: 3,
    prompt: 'What does this program print?',
    codeLang: 'python',
    code: `class A:
    def hello(self):
        print("A")

class B(A):
    def hello(self):
        print("B")
        super().hello()

class C(A):
    def hello(self):
        print("C")
        super().hello()

class D(B, C):
    def hello(self):
        print("D")
        super().hello()

D().hello()`,
    options: [
      { text: 'D\nB\nC\nA', correct: true, why: '`super()` follows the MRO `D, B, C, A`; `B`\'s `super()` is `C`, not `A`.' },
      { text: 'D\nB\nA', correct: false, why: 'This treats `super()` as "my parent"; in `B` it means the next class in `D`\'s MRO, which is `C`.' },
      { text: 'D\nB\nA\nC', correct: false, why: '`A` is last in the MRO because both `B` and `C` are its subclasses.' },
      { text: 'D\nC\nB\nA', correct: false, why: 'The MRO keeps `B` before `C`, matching the order of the bases in `class D(B, C)`.' },
    ],
    explanation: `\`super()\` is "the next class after this one in the MRO of the **instance's** class". For a \`D\` instance the MRO is \`D, B, C, A, object\`, so each cooperating method calls the next one and \`A\` runs exactly once. The same method inside \`B\` would call \`A\` directly if \`B\` instances were created.`,
  },
  {
    id: 'multiple-inheritance-q08', lang: 'python', type: 'concept', difficulty: 3,
    prompt: 'What does `D()` print?',
    codeLang: 'python',
    code: `class A:
    def __init__(self): print("A")
class B(A):
    def __init__(self):
        print("B"); A.__init__(self)
class C(A):
    def __init__(self):
        print("C"); A.__init__(self)
class D(B, C):
    def __init__(self):
        print("D"); B.__init__(self); C.__init__(self)

D()`,
    options: [
      { text: 'D, B, A, C, A: `A.__init__` runs twice, because each base calls it directly.', correct: true, why: 'Direct calls ignore the MRO, so the shared base is initialized once per path.' },
      { text: 'D, B, C, A: Python automatically avoids calling `A` twice.', correct: false, why: 'Python avoids duplicates only with cooperative `super()` calls; explicit `A.__init__(self)` always runs.' },
      { text: 'D, B, A: `C.__init__` is skipped as it is inherited from `B`.', correct: false, why: '`D.__init__` calls `C.__init__` explicitly, so it runs.' },
      { text: 'It raises `TypeError` because of the diamond.', correct: false, why: 'The MRO is consistent (`D, B, C, A`); the class is valid, only the double call is the problem.' },
    ],
    explanation: `Calling \`Base.__init__(self)\` by name bypasses the MRO: \`B\` initializes \`A\`, then \`C\` initializes \`A\` again. The cooperative fix is to use \`super().__init__()\` in every class, so each initializer runs exactly once in MRO order.`,
  },
  {
    id: 'multiple-inheritance-q09', lang: 'python', type: 'concept', difficulty: 2,
    prompt: 'What does `super()` mean in Python?',
    options: [
      { text: 'The next class after the current one in the MRO of the instance\'s type, which is not necessarily the direct parent.', correct: true, why: 'Right. That is what makes cooperative multiple inheritance work.' },
      { text: 'Always the single direct parent class of the class where it is written.', correct: false, why: 'With multiple inheritance, the "next" class may be a sibling base.' },
      { text: 'The root class `object`.', correct: false, why: '`object` is only the last class in every MRO; `super()` starts from the next class.' },
      { text: 'A copy of the base class used to initialize the instance.', correct: false, why: '`super()` returns a proxy that looks up attributes along the MRO; nothing is copied.' },
    ],
    explanation: `\`super()\` returns a proxy that delegates attribute lookups to the classes after the current one in \`type(self).__mro__\`. In single inheritance this equals the parent; in a diamond it can be a sibling, so all classes cooperate by calling \`super()\` and forwarding \`**kwargs\`.`,
  },
  {
    id: 'multiple-inheritance-q10', lang: 'python', type: 'concept', difficulty: 3,
    prompt: 'What happens when Python executes this?',
    codeLang: 'python',
    code: `class A: pass
class B(A): pass
class X(A, B): pass`,
    options: [
      { text: '`TypeError: Cannot create a consistent method resolution order`, raised when the class statement runs.', correct: true, why: 'Right. `A` before `B` contradicts `B` being a subclass of `A`, which C3 cannot satisfy.' },
      { text: 'It works; `X` gets the MRO `X, A, B, object`.', correct: false, why: 'A class must come before its base in an MRO; `A` cannot precede its subclass `B`.' },
      { text: 'It works but raises an error the first time a method is called.', correct: false, why: 'The MRO is computed at class creation, so the error appears immediately.' },
      { text: 'Python silently reorders the bases to `X(B, A)`.', correct: false, why: 'Python never rewrites your base list; it raises an error instead.' },
    ],
    explanation: `C3 requires that a class appears before its bases and that the base order you wrote is respected. \`class X(A, B)\` asks for \`A\` before \`B\` although \`B\` derives from \`A\`, a contradiction. Reorder the bases as \`class X(B, A)\`.`,
  },
  {
    id: 'multiple-inheritance-q11', lang: 'both', type: 'concept', difficulty: 2,
    prompt: 'What is a mixin?',
    options: [
      { text: 'A small class that adds one capability (like `to_json`) to classes that inherit from it, not meant to be used alone.', correct: true, why: 'Right. Mixins package a single reusable behavior and are combined with a main base class.' },
      { text: 'A class that mixes the data of all its subclasses.', correct: false, why: 'Mixins do not collect subclass data; they provide behavior to subclasses.' },
      { text: 'A special keyword that merges two classes at run time.', correct: false, why: 'There is no such keyword; a mixin is an ordinary class used through multiple inheritance.' },
      { text: 'An abstract class with no methods.', correct: false, why: 'A mixin normally contains concrete methods; an empty abstract class would add nothing.' },
    ],
    explanation: `A mixin is a focused class designed to be inherited alongside other classes to add behavior (\`JsonMixin\`, \`ReprMixin\`). Good mixins are small, usually stateless, and document what they expect from the host class. In C++ the CRTP pattern plays a similar role.`,
  },
  {
    id: 'multiple-inheritance-q12', lang: 'python', type: 'concept', difficulty: 3,
    prompt: 'A `JsonMixin` defines `to_json(self)` as `json.dumps(self.__dict__)`. It is used as `class Point(JsonMixin)` with `x` and `y` set in `__init__`. What does this show about mixins?',
    options: [
      { text: 'The mixin relies on attributes that only the host class provides, so the host\'s contract must be documented (or checked).', correct: true, why: 'Right. The mixin\'s code runs with `self` being the host instance and uses the host\'s attributes.' },
      { text: 'Mixins have their own private copy of `__dict__` separate from the host.', correct: false, why: 'There is only one instance and one `__dict__`; the mixin\'s methods see the host\'s attributes.' },
      { text: 'A mixin cannot access `self`.', correct: false, why: 'Mixin methods are normal methods and receive `self` like any other.' },
      { text: 'The code fails because `JsonMixin` has no `__init__`.', correct: false, why: 'A class without `__init__` is fine; the host defines its own initialization.' },
    ],
    explanation: `A mixin's methods execute on the host instance, so they implicitly depend on the host having certain attributes or methods. That coupling is acceptable if it is small and documented (or enforced with an \`assert\` or \`Protocol\`). Prefer mixins that need nothing, or only a clearly named hook.`,
  },
  {
    id: 'multiple-inheritance-q13', lang: 'both', type: 'compare', difficulty: 3,
    prompt: 'How do C++ virtual inheritance and the Python MRO relate to the diamond problem?',
    options: [
      { text: 'C++ makes you opt in with `virtual` to share one base subobject; Python has one linearized order, so a shared base appears once and cooperating `super()` calls reach it once.', correct: true, why: 'Right. Python\'s design avoids duplicate base subobjects, but you still must cooperate through `super()`.' },
      { text: 'Both languages always create duplicate base subobjects in a diamond.', correct: false, why: 'Python instances have a single `A` part; C++ duplicates it only without `virtual`.' },
      { text: 'Python needs a `virtual` keyword like C++.', correct: false, why: 'Python has no such keyword; its MRO provides the sharing.' },
      { text: 'In C++, the MRO decides which base runs first.', correct: false, why: 'C++ has no MRO; the order of the base-specifier list decides construction order.' },
    ],
    explanation: `In C++ a diamond duplicates the shared base unless the intermediate classes use \`virtual\` inheritance, and then the most-derived class must construct it. Python linearizes all bases into one MRO (C3), so a shared base occurs once. The price is that classes must call \`super()\` cooperatively, rather than call parent classes by name.`,
  },
  {
    id: 'multiple-inheritance-q14', lang: 'cpp', type: 'concept', difficulty: 2,
    prompt: 'Why is `class Invoice : public Printable, public Serializable` (both pure interfaces) considered safe?',
    options: [
      { text: 'Interfaces have no data members and no implementations, so there is nothing to duplicate or conflict; `Invoice` just implements each pure virtual function.', correct: true, why: 'Right. The diamond and ambiguity problems come from state and implementation, not from interfaces.' },
      { text: 'The compiler removes duplicate virtual functions automatically.', correct: false, why: 'Nothing is removed; the interfaces simply declare different functions.' },
      { text: 'C++ only allows multiple inheritance when all bases are abstract.', correct: false, why: 'C++ allows any combination; abstract interfaces are just the safest use.' },
      { text: 'Interfaces are always the last base in the list.', correct: false, why: 'There is no such ordering rule.' },
    ],
    explanation: `Pure interface classes have virtual destructors and pure virtual functions only. A class implementing several of them is the C++ equivalent of Java's \`implements A, B\`. Even a diamond of interfaces is harmless, since no data is duplicated, though virtual inheritance may still be needed to avoid ambiguity conversions.`,
  },
  {
    id: 'multiple-inheritance-q15', lang: 'python', type: 'concept', difficulty: 2,
    prompt: 'Both `A` and `B` define `name()`. What does `C().name()` call for `class C(A, B): pass`?',
    options: [
      { text: '`A.name`: the leftmost base comes first in the MRO, and lookup stops at the first match.', correct: true, why: 'Right. The MRO is `C, A, B, object`, and attribute lookup walks it left to right.' },
      { text: '`B.name`: the last listed base overrides earlier ones.', correct: false, why: 'It is the first class in the MRO that wins, not the last.' },
      { text: 'Neither; Python raises an ambiguity error like C++.', correct: false, why: 'Python never raises an error for this; the MRO decides silently.' },
      { text: 'Both are called and their results are combined.', correct: false, why: 'Only one method runs unless the methods themselves call `super()`.' },
    ],
    explanation: `Attribute lookup walks \`type(obj).__mro__\` and returns the first match. For \`class C(A, B)\` the MRO starts \`C, A, B\`, so \`A.name\` wins. If you want both to run, the methods must cooperate by calling \`super()\`.`,
  },
];
