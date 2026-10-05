export default [
  {
    id: 'generics-q01', lang: 'cpp', type: 'concept', difficulty: 1,
    prompt: 'What is a C++ class or function template?',
    options: [
      { text: 'A recipe from which the compiler generates a real class or function for each set of template arguments.', correct: true, why: 'Each distinct argument list is instantiated into ordinary, fully typed code.' },
      { text: 'A class that stores values of any type at run time.', correct: false, why: 'That describes std::any or a Python container; a template is resolved at compile time.' },
      { text: 'A base class that all generic classes must inherit from.', correct: false, why: 'Templates need no common base; Stack<int> and Stack<string> are unrelated types.' },
      { text: 'A macro that copies text with the type name substituted.', correct: false, why: 'Templates are type-checked language constructs, not textual macros.' },
    ],
    explanation: `A template is not itself a type or a function; it is a pattern. When you write \`Stack<int>\` the compiler *instantiates* a concrete class. Different instantiations are completely separate types, which is why \`Stack<int>\` and \`Stack<std::string>\` share no base class and no run-time cost for the generality.`,
  },
  {
    id: 'generics-q02', lang: 'cpp', type: 'output', difficulty: 2,
    prompt: 'What does this program print?',
    codeLang: 'cpp',
    code: `#include <iostream>
template <typename T>
T maxOf(T a, T b) { return a < b ? b : a; }
int main() {
    std::cout << maxOf<double>(3, 7.5) << " " << maxOf(3, 7);
}`,
    options: [
      { text: '7.5 7', correct: true, why: 'T is given as double in the first call (3 converts), and deduced as int in the second.' },
      { text: '7 7', correct: false, why: 'With T = double the result is 7.5; nothing truncates it to int.' },
      { text: '7.5 7.0', correct: false, why: 'The second call uses int, which prints 7, not 7.0.' },
      { text: 'It does not compile.', correct: false, why: 'Explicit arguments avoid the deduction conflict; only maxOf(3, 7.5) would fail to deduce.' },
    ],
    explanation: `Template arguments may be **deduced** from the call or **given explicitly**. In \`maxOf(3, 7.5)\` deduction would see \`int\` and \`double\` and fail. Writing \`maxOf<double>(3, 7.5)\` fixes \`T\`, so \`3\` converts implicitly. \`maxOf(3, 7)\` deduces \`int\`.`,
  },
  {
    id: 'generics-q03', lang: 'cpp', type: 'bug', difficulty: 2,
    prompt: 'A template `template <typename T> T twice(T x);` is declared in `util.h` and defined in `util.cpp`. `main.cpp` calls `twice(2)`. What happens?',
    options: [
      { text: 'A link error (undefined reference): the definition was never visible to instantiate `twice<int>`.', correct: true, why: 'The compiler instantiates from the definition; main.cpp only saw the declaration.' },
      { text: 'It works; the linker generates the instantiation.', correct: false, why: 'The linker only combines compiled code; it cannot instantiate templates.' },
      { text: 'A compile error: templates cannot be declared in headers.', correct: false, why: 'Headers are exactly where templates belong, with their definitions included.' },
      { text: 'It works but only for `int`.', correct: false, why: 'It fails for every type unless util.cpp itself instantiates that type.' },
    ],
    explanation: `The compiler needs the full template definition at the point of instantiation. Put the definition in the header (or include a \`.tpp\` from it). The exception is an **explicit instantiation** (\`template int twice<int>(int);\`) in \`util.cpp\`, which compiles that one specialization for the linker to find.`,
  },
  {
    id: 'generics-q04', lang: 'cpp', type: 'concept', difficulty: 2,
    prompt: 'Given the code below, what does `Printer<bool>::show(true)` return?',
    codeLang: 'cpp',
    code: `template <typename T> struct Printer {
    static std::string show(const T& v) { return std::to_string(v); }
};
template <> struct Printer<bool> {
    static std::string show(bool v) { return v ? "yes" : "no"; }
};`,
    options: [
      { text: '`"yes"`: the full specialization replaces the primary template for `bool`.', correct: true, why: 'template <> struct Printer<bool> is chosen for exactly that argument.' },
      { text: '`"1"`: the primary template still applies.', correct: false, why: 'A specialization is preferred over the primary template when its arguments match.' },
      { text: 'A compile error: you cannot specialize with the same members.', correct: false, why: 'A specialization is an independent class and may have any members.' },
      { text: '`"true"`', correct: false, why: 'No code produces that; to_string(bool) would give "1" and is not used here.' },
    ],
    explanation: `A **full specialization** (\`template <>\`) supplies a completely separate definition for one exact argument list; it shares nothing with the primary template. **Partial** specialization (e.g. \`Printer<T*>\`) works for class templates and matches a family. Function templates cannot be partially specialized, so overloads are used instead.`,
  },
  {
    id: 'generics-q05', lang: 'cpp', type: 'output', difficulty: 2,
    prompt: 'What does this CRTP program print?',
    codeLang: 'cpp',
    code: `#include <iostream>
template <class D>
struct Animal {
    void speak() { std::cout << static_cast<D*>(this)->sound() << " "; }
};
struct Dog : Animal<Dog> { const char* sound() { return "Woof"; } };
struct Cat : Animal<Cat> { const char* sound() { return "Meow"; } };
int main() {
    Dog d; Cat c;
    d.speak();
    c.speak();
}`,
    options: [
      { text: 'Woof Meow', correct: true, why: 'Each speak() was instantiated for its own D, so it calls the right sound() without virtual.' },
      { text: 'Meow Woof', correct: false, why: 'The calls run in source order: the Dog speaks first.' },
      { text: 'Woof Woof', correct: false, why: 'Animal<Dog> and Animal<Cat> are different classes; no behavior is shared between them.' },
      { text: 'It does not compile because speak() is not virtual.', correct: false, why: 'CRTP deliberately avoids virtual; the base knows Derived statically.' },
    ],
    explanation: `In CRTP the base class template is parameterized by its derived class, so \`Animal<Dog>::speak\` can cast \`this\` to \`Dog*\` and call \`sound()\` with *static dispatch*: the call is resolved at compile time and can be inlined. The cost is that \`Dog\` and \`Cat\` have no common base type for a heterogeneous container.`,
  },
  {
    id: 'generics-q06', lang: 'cpp', type: 'concept', difficulty: 2,
    prompt: 'What do C++20 concepts mainly improve?',
    options: [
      { text: 'They state template requirements in the signature and produce clear errors at the call site.', correct: true, why: 'A failed constraint is reported against the concept, not deep in the template body.' },
      { text: 'They make templates run faster.', correct: false, why: 'Constraints are checked at compile time and do not change generated code.' },
      { text: 'They add run-time type checks to template arguments.', correct: false, why: 'Concepts are purely compile-time; nothing is checked while the program runs.' },
      { text: 'They allow templates to be defined in .cpp files.', correct: false, why: 'The visibility rule for template definitions is unchanged by concepts.' },
    ],
    explanation: `Before concepts, passing a bad type produced pages of errors from inside the template. A constraint like \`template <std::totally_ordered T>\` documents the requirement and makes overload resolution fail early with a message naming the unsatisfied concept. Concepts also let you overload templates by capability.`,
  },
  {
    id: 'generics-q07', lang: 'cpp', type: 'concept', difficulty: 3,
    prompt: 'In this template, what happens for `kind<std::string>()`?',
    codeLang: 'cpp',
    code: `template <typename T>
std::string kind() {
    if constexpr (std::is_integral_v<T>) return "integer" + 0;
    else return "other";
}`,
    options: [
      { text: 'The `if constexpr` discards the integral branch at compile time, so it is never compiled for `std::string`; it returns "other".', correct: true, why: 'In a template, the discarded branch of if constexpr is not instantiated.' },
      { text: 'Both branches are compiled and the condition is tested at run time.', correct: false, why: 'That is plain if; if constexpr drops the unselected branch at compile time.' },
      { text: 'A compile error from `"integer" + 0` for any T.', correct: false, why: 'That expression is valid pointer arithmetic, and it is not instantiated here anyway.' },
      { text: 'It returns an empty string.', correct: false, why: 'The else branch returns "other"; control never falls off the end.' },
    ],
    explanation: `\`if constexpr\` evaluates its condition during instantiation and **discards** the other branch, which therefore need not even be valid for that \`T\`. A plain \`if\` would still compile both branches, failing for types that do not support one of them. This is how a single template adapts to many types without specialization.`,
  },
  {
    id: 'generics-q08', lang: 'both', type: 'compare', difficulty: 2,
    prompt: 'How do C++ templates compare with Python duck typing as a way to be generic?',
    options: [
      { text: 'Both accept any type with the needed operations; C++ checks that at compile time per instantiation, Python at run time on use.', correct: true, why: 'Both are structural; the difference is when a missing operation is reported.' },
      { text: 'Python needs templates too, but spells them with TypeVar.', correct: false, why: 'TypeVar only helps type checkers; the interpreter runs generic code with no templates.' },
      { text: 'C++ templates are checked at run time like duck typing.', correct: false, why: 'Template errors appear at compile time, before the program runs.' },
      { text: 'Duck typing requires a common base class.', correct: false, why: 'The whole idea is that no shared base is needed, only matching behavior.' },
    ],
    explanation: `Both styles are *structural*: they care what an object can do, not what it inherits from. C++ resolves and checks it at compile time, giving speed and early errors. Python resolves it at run time, giving flexibility but later errors, which static checkers and \`Protocol\` hints try to move earlier.`,
  },
  {
    id: 'generics-q09', lang: 'python', type: 'output', difficulty: 2,
    prompt: 'What does this program print?',
    codeLang: 'python',
    code: `from typing import Generic, TypeVar

T = TypeVar("T")

class Stack(Generic[T]):
    def __init__(self):
        self.items = []
    def push(self, x: T):
        self.items.append(x)

s: Stack[int] = Stack()
s.push("hello")
print(s.items)`,
    options: [
      { text: "['hello']", correct: true, why: 'Type hints are not enforced at run time; only a type checker would flag the str.' },
      { text: 'TypeError', correct: false, why: 'Python does not check annotations when calling a function.' },
      { text: '[]', correct: false, why: 'push succeeded, so the list contains the string.' },
      { text: 'AttributeError', correct: false, why: 'items exists and append works normally.' },
    ],
    explanation: `\`Stack[int]\` is metadata for tools such as mypy and pyright. At run time the annotation is ignored, so pushing a \`str\` works. If you need run-time enforcement, check with \`isinstance\` yourself. This is the biggest difference from C++, where \`Stack<int>::push("hello")\` is a compile error.`,
  },
  {
    id: 'generics-q10', lang: 'python', type: 'concept', difficulty: 3,
    prompt: 'What does a bounded type variable such as `def largest[T: SupportsLt](items: list[T]) -> T` express?',
    options: [
      { text: 'T may be any type that satisfies SupportsLt, and the return type is the same T as the items.', correct: true, why: 'The bound restricts the allowed types and the repeated T links input and output.' },
      { text: 'T must be a subclass of SupportsLt at run time, checked by the interpreter.', correct: false, why: 'Bounds are checked by static tools only, and a Protocol needs no inheritance.' },
      { text: 'T can only be int.', correct: false, why: 'A bound names a capability or upper class, not one type.' },
      { text: 'The function returns a SupportsLt object, not the item type.', correct: false, why: 'The return T preserves the specific item type, which is why a TypeVar is used.' },
    ],
    explanation: `A bound constrains which types a checker accepts for \`T\`; the repeated \`T\` tells the checker that passing \`list[int]\` gives back an \`int\`, not just "something comparable". The comparison to C++ is \`template <std::totally_ordered T>\`. Python never enforces the bound while running.`,
  },
  {
    id: 'generics-q11', lang: 'python', type: 'compare', difficulty: 3,
    prompt: 'When writing a generic function bound, why might you choose a `Protocol` over an ABC?',
    options: [
      { text: 'A Protocol is structural: classes qualify by having the right methods, without inheriting from it.', correct: true, why: 'This matches duck typing, so third-party classes qualify automatically.' },
      { text: 'A Protocol forces run-time checks on every call.', correct: false, why: 'Protocols are checked by static tools unless marked runtime_checkable (and then only shallowly).' },
      { text: 'ABCs cannot declare abstract methods.', correct: false, why: 'Abstract methods are exactly what ABCs are for.' },
      { text: 'Protocols make the class instantiable with no methods.', correct: false, why: 'A Protocol is an interface description; it is not meant to be instantiated.' },
    ],
    explanation: `An ABC is *nominal*: a class must explicitly inherit from it (or be registered). A \`Protocol\` is *structural*: anything with matching methods fits, which mirrors both duck typing and C++ concepts. Use ABCs when you want shared implementation or explicit opt-in, and Protocols for lightweight bounds.`,
  },
  {
    id: 'generics-q12', lang: 'cpp', type: 'compare', difficulty: 3,
    prompt: 'What is the main trade-off between virtual functions and CRTP?',
    options: [
      { text: 'Virtual allows one container of mixed types and late binding; CRTP gives inlinable static dispatch but no common runtime base.', correct: true, why: 'Run-time flexibility costs an indirect call; compile-time binding costs heterogeneity.' },
      { text: 'CRTP is always slower because of template instantiation.', correct: false, why: 'Instantiation costs compile time; the generated calls are usually faster.' },
      { text: 'Virtual functions cannot be overridden in derived classes.', correct: false, why: 'Overriding is the point of virtual functions.' },
      { text: 'CRTP supports mixed-type containers through the base pointer.', correct: false, why: 'Animal<Dog> and Animal<Cat> are unrelated types, so no shared base pointer exists.' },
    ],
    explanation: `Virtual dispatch uses a vtable and works when the concrete type is known only at run time: plugins, heterogeneous collections. CRTP resolves calls at compile time, enabling inlining and mixins, but every derived type has a different base. Choose by whether you need run-time substitutability.`,
  },
  {
    id: 'generics-q13', lang: 'cpp', type: 'concept', difficulty: 3,
    prompt: 'For `template <class T> constexpr bool isInt = std::is_same_v<T, int>;`, which is true?',
    options: [
      { text: '`isInt<int>` is true, but `isInt<const int>` is false.', correct: true, why: 'is_same_v compares exact types, and const int is a different type from int.' },
      { text: '`isInt<const int>` is also true.', correct: false, why: 'Cv-qualifiers are part of the type; use std::remove_cv_t first to ignore them.' },
      { text: '`isInt<long>` is true because both are integers.', correct: false, why: 'is_same_v tests identity, not "integer-ness"; that is is_integral_v.' },
      { text: 'It is evaluated at run time.', correct: false, why: 'A constexpr variable template is evaluated at compile time.' },
    ],
    explanation: `\`std::is_same_v<A, B>\` is true only when \`A\` and \`B\` are exactly the same type, including \`const\` and \`volatile\`. Type traits like this run entirely at compile time and are the building blocks for \`if constexpr\` and concepts. Use \`std::remove_cvref_t<T>\` to strip qualifiers first.`,
  },
  {
    id: 'generics-q14', lang: 'python', type: 'concept', difficulty: 2,
    prompt: 'What does PEP 695 syntax `class Box[T]:` mean?',
    options: [
      { text: 'It declares a generic class whose type parameter T is scoped to the class, replacing TypeVar and Generic[T].', correct: true, why: 'Available since Python 3.12; the parameter needs no module-level TypeVar.' },
      { text: 'It creates a list-like container of T at run time.', correct: false, why: 'Square brackets here declare a type parameter, not a container.' },
      { text: 'It enforces that every Box holds the same type.', correct: false, why: 'Enforcement comes only from static checkers, not the interpreter.' },
      { text: 'It is a C++-style template compiled before running.', correct: false, why: 'Python does not compile per-type code; it is annotation syntax.' },
    ],
    explanation: `PEP 695 (Python 3.12+) gives generics native syntax: \`class Box[T]:\`, \`def f[T](x: T) -> T:\` and \`type Alias[T] = ...\`. The type parameter lives in its own scope and variance is inferred by checkers. Semantically it is the same as \`Generic[T]\` with a \`TypeVar\`, and it is still ignored at run time.`,
  },
  {
    id: 'generics-q15', lang: 'cpp', type: 'bug', difficulty: 3,
    prompt: 'Which call fails to compile?',
    codeLang: 'cpp',
    code: `#include <concepts>
#include <string>
#include <vector>

template <std::totally_ordered T>
T biggest(const T& a, const T& b) { return a < b ? b : a; }

struct Opaque {};

// A: biggest(1, 2)
// B: biggest(std::string("a"), std::string("b"))
// C: biggest(Opaque{}, Opaque{})
// D: biggest(2.5, 1.5)`,
    options: [
      { text: 'C: `Opaque` has no comparison operators, so the constraint is not satisfied.', correct: true, why: 'totally_ordered requires ==, !=, <, >, <= and >= to be valid and consistent.' },
      { text: 'B: strings are not ordered.', correct: false, why: 'std::string has all comparison operators and satisfies totally_ordered.' },
      { text: 'D: `double` is not comparable.', correct: false, why: 'Floating-point types satisfy totally_ordered syntactically.' },
      { text: 'A: `int` literals cannot bind to const references.', correct: false, why: 'A temporary binds to const T& and T deduces to int.' },
    ],
    explanation: `\`std::totally_ordered<T>\` requires the full set of comparison operators. \`Opaque\` has none, so the call is rejected at overload resolution with a message naming the unsatisfied constraint instead of an error inside \`biggest\`'s body. That is the readability benefit of \`requires\`.`,
  },
];
