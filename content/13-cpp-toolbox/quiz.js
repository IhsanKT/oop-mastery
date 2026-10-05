export default [
  {
    id: 'cpp-toolbox-q01', lang: 'cpp', type: 'concept', difficulty: 1,
    prompt: 'What does declaring a member function `const` promise?',
    options: [
      { text: 'It will not modify the object\'s observable state through `this`.', correct: true, why: 'Inside a const member, `this` is a pointer to const, so ordinary data members cannot be assigned.' },
      { text: 'It will not modify anything anywhere, including globals.', correct: false, why: 'const only concerns the object itself; the function may still change globals or other objects.' },
      { text: 'It can only be called on temporary objects.', correct: false, why: 'Const members can be called on any object; they are simply the only ones allowed on const objects.' },
      { text: 'It runs at compile time.', correct: false, why: 'That is constexpr; const says nothing about when the function is evaluated.' },
    ],
    explanation: `A const member function makes \`this\` a \`const T*\`, so members cannot be assigned (unless \`mutable\`). That is what lets the function be called on const objects and const references. It is a promise about the object, not about the whole program.`,
  },
  {
    id: 'cpp-toolbox-q02', lang: 'cpp', type: 'bug', difficulty: 1,
    prompt: 'Why does this fail to compile?',
    codeLang: 'cpp',
    code: `struct Account {
    int balance = 0;
    void deposit(int n) { balance += n; }
    int get() const { return balance; }
};
void audit(const Account& a) {
    a.deposit(5);
}`,
    options: [
      { text: '`deposit` is not const, so it cannot be called through a `const Account&`.', correct: true, why: 'A const reference only exposes const members; deposit would modify the object.' },
      { text: '`audit` must take its parameter by value.', correct: false, why: 'Passing by const reference is idiomatic; by value would compile but copy the object.' },
      { text: '`get` is missing `mutable`.', correct: false, why: 'mutable applies to data members and is unrelated to this error; get is fine as written.' },
      { text: '`balance` should be private.', correct: false, why: 'Access control does not matter here; the error is a const-qualification violation.' },
    ],
    explanation: `Calling a non-const member function through a const reference discards the \`const\` qualifier, which the compiler rejects. Either mark methods that do not modify state as \`const\`, or do not pass the object as const when you need to mutate it. Here \`deposit\` genuinely mutates, so \`audit\` must not call it.`,
  },
  {
    id: 'cpp-toolbox-q03', lang: 'cpp', type: 'output', difficulty: 2,
    prompt: 'What does this program print?',
    codeLang: 'cpp',
    code: `#include <iostream>
struct Box {
    int v = 1;
    int& get() { std::cout << "mutable "; return v; }
    const int& get() const { std::cout << "const "; return v; }
};
int main() {
    Box b;
    const Box& cb = b;
    b.get();
    cb.get();
}`,
    options: [
      { text: 'mutable const', correct: true, why: 'The non-const object picks the non-const overload; the const reference picks the const one.' },
      { text: 'mutable mutable', correct: false, why: 'cb is a const reference, so the non-const overload is not viable through it.' },
      { text: 'const const', correct: false, why: 'A non-const object prefers the non-const overload; it needs no added qualification.' },
      { text: 'const mutable', correct: false, why: 'This reverses the rule; the object\'s constness decides, not the call order.' },
    ],
    explanation: `Overload resolution on the implicit \`this\` argument: a non-const object binds best to the non-const member, while a const object or reference can only use the const member. This is how \`std::vector::operator[]\` gives read-write access on one and read-only on the other.`,
  },
  {
    id: 'cpp-toolbox-q04', lang: 'cpp', type: 'concept', difficulty: 2,
    prompt: 'A const method `double area() const` fills a cached value member on first call. How should the cache be declared?',
    options: [
      { text: '`mutable`, because the cache is not part of the object\'s logical value.', correct: true, why: 'mutable members can be modified even in const functions, matching logical constness.' },
      { text: 'Use `const_cast<Shape*>(this)` inside area().', correct: false, why: 'This can be undefined behavior if the object was originally const, and hides intent.' },
      { text: 'Make the method non-const.', correct: false, why: 'That would break callers holding const references; the caller does not see a change.' },
      { text: '`static`, so it is shared by all objects.', correct: false, why: 'A static cache would be shared between different shapes, giving wrong results.' },
    ],
    explanation: `\`mutable\` separates *logical* constness (what callers can observe) from *bitwise* constness (no byte changes). Caches, lazily computed values, counters and mutexes are classic mutable members. \`const_cast\` on a truly const object is undefined behavior if you modify it.`,
  },
  {
    id: 'cpp-toolbox-q05', lang: 'cpp', type: 'concept', difficulty: 2,
    prompt: 'Given `struct Meters { Meters(double); };` and `void f(Meters);`, which call compiles?',
    options: [
      { text: '`f(3.5);` because the converting constructor allows an implicit conversion.', correct: true, why: 'A non-explicit one-argument constructor defines an implicit conversion from double to Meters.' },
      { text: 'Neither compiles; constructors never convert implicitly.', correct: false, why: 'Implicit conversion via constructors is the default unless you write explicit.' },
      { text: '`f(3.5);` only with a cast `f((Meters)3.5)`.', correct: false, why: 'No cast is needed; the cast form works too, but it is not required.' },
      { text: '`f("3.5");` converts the string to Meters.', correct: false, why: 'A string literal does not convert to double, and only one user-defined conversion is allowed anyway.' },
    ],
    explanation: `A constructor callable with one argument is a converting constructor. Unless marked \`explicit\`, the compiler may use it for implicit conversions, which is convenient but can cause surprises with overloads. At most one user-defined conversion is applied implicitly.`,
  },
  {
    id: 'cpp-toolbox-q06', lang: 'cpp', type: 'bug', difficulty: 2,
    prompt: 'Why does the marked line fail?',
    codeLang: 'cpp',
    code: `struct Seconds {
    explicit Seconds(double d) : v(d) {}
    double v;
};
Seconds a{2.0};
Seconds b = 2.0;   // <- fails`,
    options: [
      { text: 'Copy-initialization (`= 2.0`) cannot use an `explicit` constructor.', correct: true, why: 'Only direct-initialization may select explicit constructors; the = form needs an implicit conversion.' },
      { text: 'A `double` cannot initialize a `Seconds` in any way.', correct: false, why: 'Line `Seconds a{2.0}` shows direct-initialization works fine.' },
      { text: 'The member `v` is not initialized first.', correct: false, why: 'The mem-initializer list does initialize v; that is not the issue.' },
      { text: '`Seconds` needs a default constructor.', correct: false, why: 'Neither declaration is default-constructing; no default constructor is required.' },
    ],
    explanation: `\`explicit\` removes the constructor from implicit conversions and copy-initialization (\`T x = value;\`, passing by value, returning a value). Direct forms such as \`T x(value)\` and \`T x{value}\` still work. That makes accidental conversions impossible.`,
  },
  {
    id: 'cpp-toolbox-q07', lang: 'cpp', type: 'concept', difficulty: 2,
    prompt: 'What does this program print?',
    codeLang: 'cpp',
    code: `#include <iostream>
struct Handle {
    int fd;
    explicit operator bool() const { return fd >= 0; }
};
int main() {
    Handle ok{3}, bad{-1};
    if (ok) std::cout << "ok ";
    if (!bad) std::cout << "bad ";
    bool b = static_cast<bool>(bad);
    std::cout << b;
}`,
    options: [
      { text: 'ok bad 0', correct: true, why: 'Contextual conversion (if, !) works with explicit operator bool; static_cast gives false, printed as 0.' },
      { text: 'does not compile', correct: false, why: 'explicit operator bool is allowed in if conditions and with the ! operator, so this compiles.' },
      { text: 'ok 0', correct: false, why: 'The second if tests !bad, and bad is invalid, so that branch runs.' },
      { text: 'ok bad 1', correct: false, why: 'bad.fd is -1, so the conversion is false, which prints as 0.' },
    ],
    explanation: `\`if\`, \`while\`, \`!\`, \`&&\`, \`||\` and the ternary condition are *contextual conversions* to bool, which may use an \`explicit operator bool\`. What \`explicit\` blocks is the implicit conversion in things like \`int x = handle;\` or \`handle + 1\`. This is the "safe bool" idiom.`,
  },
  {
    id: 'cpp-toolbox-q08', lang: 'cpp', type: 'concept', difficulty: 2,
    prompt: 'What does a `constexpr` constructor give you?',
    options: [
      { text: 'Objects that can be created in constant expressions, e.g. `constexpr Point p{1,2};` and in `static_assert`.', correct: true, why: 'The constructor can run at compile time when its arguments are constant.' },
      { text: 'Objects that are always created at compile time, even with runtime arguments.', correct: false, why: 'With runtime arguments the constructor simply runs at run time; constexpr only permits compile time.' },
      { text: 'Objects that can never be modified.', correct: false, why: 'Only the constexpr variable is const; a non-constexpr object built the same way stays mutable.' },
      { text: 'Automatic thread safety.', correct: false, why: 'constexpr is unrelated to threading; it concerns compile-time evaluation.' },
    ],
    explanation: `A \`constexpr\` constructor (with a literal type) may be evaluated during compilation, enabling \`constexpr\` objects, \`static_assert\` checks and use as template arguments. It does not force compile-time evaluation; \`consteval\` does that.`,
  },
  {
    id: 'cpp-toolbox-q09', lang: 'cpp', type: 'concept', difficulty: 2,
    prompt: 'A class has `void set(int)` and `void set(double) = delete;`. What happens with `obj.set(2.5)`?',
    options: [
      { text: 'Compile error: the deleted overload is the best match and is ill-formed.', correct: true, why: 'Deleted functions take part in overload resolution; being exact for double, it wins and then errors.' },
      { text: 'It calls `set(int)` with the value truncated.', correct: false, why: 'That would happen without the deleted overload; deleting exists to stop it.' },
      { text: 'The deleted overload is ignored by overload resolution.', correct: false, why: 'Deleted functions are still candidates; they are not removed from consideration.' },
      { text: 'A linker error occurs.', correct: false, why: 'The error is diagnosed at compile time, since the deleted function has no definition by design.' },
    ],
    explanation: `\`= delete\` makes a function *declared but unusable*. Because it remains a candidate, an exact match like \`set(double)\` is chosen and the call is rejected, preventing silent narrowing to \`int\`. This also works for deleting copy operations.`,
  },
  {
    id: 'cpp-toolbox-q10', lang: 'cpp', type: 'concept', difficulty: 2,
    prompt: 'Since C++11, can a nested class access the private members of its enclosing class?',
    options: [
      { text: 'Yes, through an object of the outer class, because a nested class is a member of it.', correct: true, why: 'A nested class has the same access rights as any other member of the enclosing class.' },
      { text: 'No, nesting gives no special access.', correct: false, why: 'Unlike in Java-like thinking about separate scopes, C++ nested classes are members and get access.' },
      { text: 'Yes, and it also gets an implicit pointer to the outer object.', correct: false, why: 'There is no implicit outer instance in C++; you must pass one explicitly.' },
      { text: 'Only if declared `friend`.', correct: false, why: 'Friend declarations are not required for nested classes to use the outer class\'s privates.' },
    ],
    explanation: `A nested class is a member of the enclosing class and so can use its private names, but only on an *object* (there is no hidden outer instance as in Java inner classes). The reverse is not true: the outer class has no special access to the nested class's privates. This is why an \`Iterator\` can be nested.`,
  },
  {
    id: 'cpp-toolbox-q11', lang: 'cpp', type: 'output', difficulty: 3,
    prompt: 'What does this program print?',
    codeLang: 'cpp',
    code: `#include <iostream>
class Sensor {
    mutable int reads_ = 0;
    int value_ = 42;
public:
    int read() const { ++reads_; return value_; }
    int reads() const { return reads_; }
};
int main() {
    const Sensor s;
    s.read(); s.read(); s.read();
    std::cout << s.reads() << " " << s.read();
}`,
    options: [
      { text: '3 42', correct: true, why: 'Three reads increment the mutable counter; reads() is evaluated before the last read() in the output sequence.' },
      { text: '4 42', correct: false, why: 'This counts the final read() too, but reads() is sequenced first in the stream expression.' },
      { text: '0 42', correct: false, why: 'mutable lets const methods change reads_, so it does not stay at 0.' },
      { text: 'does not compile', correct: false, why: 'A mutable member can be modified in a const member function even on a const object.' },
    ],
    explanation: `\`mutable\` lets const member functions modify the counter even on a \`const Sensor\`. Since C++17 the left operand of \`<<\` is sequenced before the right, so \`s.reads()\` yields 3 before the final \`s.read()\` runs. Also note \`const Sensor s;\` needs the default member initializers to be allowed.`,
  },
  {
    id: 'cpp-toolbox-q12', lang: 'both', type: 'compare', difficulty: 2,
    prompt: 'How does C++ `explicit operator bool` compare to Python\'s `__bool__`?',
    options: [
      { text: 'Both define truthiness for conditions, but C++ blocks accidental conversion to numbers while Python\'s result is only used for truth tests.', correct: true, why: 'explicit keeps the bool out of arithmetic; Python has no implicit numeric use of __bool__.' },
      { text: 'They are identical in every context.', correct: false, why: 'C++ distinguishes contextual and implicit conversion; Python has no such distinction.' },
      { text: 'Python\'s `__bool__` can return any value.', correct: false, why: 'It must return a real bool; returning something else raises TypeError.' },
      { text: 'In C++ you must write `operator bool` non-explicit to use it in `if`.', correct: false, why: 'explicit already works in if; non-explicit is what causes accidental arithmetic.' },
    ],
    explanation: `Both let an object answer "am I valid or non-empty?". In C++ the \`explicit\` keyword narrows the conversion to contexts that clearly mean a condition. In Python, if \`__bool__\` is missing, \`__len__\` is used, and otherwise the object is truthy.`,
  },
  {
    id: 'cpp-toolbox-q13', lang: 'python', type: 'concept', difficulty: 2,
    prompt: 'What does this program print?',
    codeLang: 'python',
    code: `from functools import cached_property

class Report:
    calls = 0

    @cached_property
    def total(self):
        Report.calls += 1
        return 10

r = Report()
r.total
r.total
print(Report.calls)`,
    options: [
      { text: '1', correct: true, why: 'cached_property stores the result in the instance __dict__, so the function body runs once.' },
      { text: '2', correct: false, why: 'That treats it like a plain property, which recomputes on every access.' },
      { text: '0', correct: false, why: 'Accessing the attribute does run the function the first time.' },
      { text: '10', correct: false, why: 'The program prints the counter, not the cached value.' },
    ],
    explanation: `\`cached_property\` is a non-data descriptor: the first access runs the function and stores the result in the instance \`__dict__\` under the same name; later lookups find the instance value first and never call the function. Delete the attribute to force recomputation. It is the Python analogue of a C++ \`mutable\` cache.`,
  },
  {
    id: 'cpp-toolbox-q14', lang: 'python', type: 'output', difficulty: 2,
    prompt: 'What does this program print?',
    codeLang: 'python',
    code: `from types import MappingProxyType

d = {"a": 1}
view = MappingProxyType(d)
try:
    view["a"] = 2
except TypeError:
    print("TypeError")`,
    options: [
      { text: 'TypeError', correct: true, why: 'A mappingproxy does not support item assignment, so the assignment raises TypeError.' },
      { text: 'Nothing; the value changes silently.', correct: false, why: 'The proxy is read-only; that is the whole point of the wrapper.' },
      { text: 'KeyError', correct: false, why: 'The key exists and the failure is about assignment support, not lookup.' },
      { text: 'AttributeError', correct: false, why: 'Item assignment on an unsupported type raises TypeError, not AttributeError.' },
    ],
    explanation: `\`MappingProxyType\` offers a read-only view of a dict. Writes through the proxy raise \`TypeError\`, but it is a *view*: if the owner changes \`d\`, the view shows the change. It is Python's nearest relative of returning a \`const&\` from a C++ getter.`,
  },
  {
    id: 'cpp-toolbox-q15', lang: 'cpp', type: 'concept', difficulty: 2,
    prompt: 'What is `[[nodiscard]]` on a function for?',
    options: [
      { text: 'It makes the compiler warn when a caller ignores the returned value.', correct: true, why: 'It marks results that are likely a mistake to drop, like factories and error codes.' },
      { text: 'It prevents the function from being called twice.', correct: false, why: 'The attribute never restricts the number of calls; it only affects diagnostics.' },
      { text: 'It forces the return value to be moved.', correct: false, why: 'It has no effect on move semantics or code generation.' },
      { text: 'It makes the function constexpr.', correct: false, why: 'Attributes do not change evaluation rules; constexpr is a separate keyword.' },
    ],
    explanation: `\`[[nodiscard]]\` asks the compiler to diagnose a discarded result, which catches bugs like calling \`empty()\` when you meant \`clear()\`, or ignoring a factory's return. It does not change behavior; you can cast to \`void\` to discard intentionally. The hidden friend idiom, defining a friend inside the class, is a separate technique that keeps operators out of namespace scope.`,
  },
];
