export default [
  {
    id: 'operators-q01', lang: 'both', type: 'concept', difficulty: 1,
    prompt: 'When is it a good idea to overload an operator (or define a dunder method) for your own class?',
    options: [
      { text: 'When the operator has an obvious, conventional meaning for the type, such as `+` on a `Money` or `Vector` class.', correct: true, why: 'Right. Operators are good when readers can guess the meaning without looking it up, as with built-in types.' },
      { text: 'Whenever a method exists, because operators are always faster than named functions.', correct: false, why: 'Operators are just function calls with nicer syntax; they bring no speed benefit and can hide cost.' },
      { text: 'When you want to invent a surprising meaning, such as `user1 + user2` creating a friendship.', correct: false, why: 'Surprising meanings make code unreadable. A named function like `befriend` would be clearer.' },
      { text: 'Never, because overloading is considered bad practice in both languages.', correct: false, why: 'Overloading is idiomatic for numeric, string-like and container types. The advice is restraint, not abstinence.' },
    ],
    explanation: `Operator overloading exists so user-defined types can feel as natural as built-ins. It pays off when the operator matches its conventional meaning (arithmetic on numeric types, \`==\` for value equality, \`[]\` for lookup). When the meaning is not obvious to a reader, a named function documents the intent better and costs nothing.`,
  },
  {
    id: 'operators-q02', lang: 'cpp', type: 'bug', difficulty: 1,
    prompt: 'Why does `Vec w = 2 * v;` fail to compile here, while `v * 2` works?',
    codeLang: 'cpp',
    code: `struct Vec {
    double x, y;
    Vec operator*(double k) const { return {x * k, y * k}; }
};`,
    options: [
      { text: 'A member operator needs the object on its left, and `2` is an `int`, which has no member `operator*(Vec)`. Add a free `operator*(double, const Vec&)`.', correct: true, why: 'Right. The left operand of a member operator is `*this`, so `2 * v` needs a non-member overload.' },
      { text: 'Multiplication must be declared `friend` in order to be overloaded at all.', correct: false, why: '`friend` only grants access to private members. The member version already compiles for `v * 2`.' },
      { text: 'C++ converts `2` to `Vec` automatically, but the constructor is missing.', correct: false, why: 'Implicit conversion applies to the right-hand argument of a member operator, never to the left operand that selects the function.' },
      { text: 'Operators are not commutative in C++, so the compiler rejects every swapped call.', correct: false, why: 'The compiler never assumes commutativity; it looks up one function per written order, and you can provide both.' },
    ],
    explanation: `For \`a * b\` C++ considers \`a.operator*(b)\` and \`operator*(a, b)\`. With \`a == 2\` there is no class to hold a member, so only a free function can match. The usual fix is a free \`operator*(double k, const Vec& v) { return v * k; }\`.`,
  },
  {
    id: 'operators-q03', lang: 'cpp', type: 'output', difficulty: 1,
    prompt: 'What does this program print? `operator+` is built on `operator+=`.',
    codeLang: 'cpp',
    code: `#include <iostream>

struct Money {
    int cents;
    Money& operator+=(const Money& o) { cents += o.cents; return *this; }
    friend Money operator+(Money a, const Money& b) { a += b; return a; }
};

int main() {
    Money a{100}, b{250};
    Money c = a + b;
    a += b;
    std::cout << a.cents << " " << b.cents << " " << c.cents << "\\n";
}`,
    options: [
      { text: '350 250 350', correct: true, why: '`a + b` works on a copy of `a`, so `c` is 350 and `a` is unchanged until `a += b` makes it 350.' },
      { text: '100 250 350', correct: false, why: '`a += b` does mutate `a`; this would be the output only if the `+=` line were missing.' },
      { text: '350 250 600', correct: false, why: '`c` was computed before `a += b` ran, from the original 100, so it is 350, not 600.' },
      { text: '600 250 350', correct: false, why: '`a` receives `b` only once, from the `+=` line; `a + b` did not modify `a` because it used a copy.' },
    ],
    explanation: `\`operator+\` takes its left operand **by value**, so \`a += b\` inside it changes a copy and the returned value is the sum. The original \`a\` is only changed by the explicit \`a += b\`. Writing \`+=\` once and building \`+\` on it keeps the two consistent.`,
  },
  {
    id: 'operators-q04', lang: 'cpp', type: 'output', difficulty: 2,
    prompt: 'What does this program print?',
    codeLang: 'cpp',
    code: `#include <iostream>

struct Counter {
    int n = 0;
    Counter& operator++() { ++n; return *this; }
    Counter operator++(int) { Counter old = *this; ++n; return old; }
};

int main() {
    Counter c;
    int a = (c++).n;
    int b = (++c).n;
    std::cout << a << " " << b << " " << c.n << "\\n";
}`,
    options: [
      { text: '0 2 2', correct: true, why: 'Post-increment returns the old state (0); then pre-increment makes it 2 and returns the updated object.' },
      { text: '1 2 2', correct: false, why: 'That would be the result if `c++` returned the new value; it returns a copy of the old state.' },
      { text: '0 1 2', correct: false, why: 'After `c++` the counter is already 1, so `++c` yields 2, not 1.' },
      { text: '1 1 2', correct: false, why: 'Neither expression returns a stale value of 1 for `b`; `++c` returns the counter after the second increment.' },
    ],
    explanation: `The prefix form increments and returns a reference to the object itself. The postfix form (marked by a dummy \`int\` parameter) copies the old value, increments, and returns the **copy**. That extra copy is why \`++i\` is preferred for non-trivial types when the old value is not needed.`,
  },
  {
    id: 'operators-q05', lang: 'cpp', type: 'concept', difficulty: 2,
    prompt: 'What does this give you, and does `std::sort` work on a `std::vector<Version>`?',
    codeLang: 'cpp',
    code: `struct Version {
    int major, minor;
    auto operator<=>(const Version&) const = default;
};`,
    options: [
      { text: 'A lexicographic comparison by `major` then `minor` that provides `<`, `<=`, `>`, `>=`, so `std::sort` works.', correct: true, why: 'Right. The defaulted `<=>` compares members in declaration order and the compiler rewrites the relational operators from it.' },
      { text: 'Nothing useful: `<=>` only works with `==`, so `std::sort` fails to compile.', correct: false, why: '`<=>` is exactly what supplies the ordering operators; `std::sort` only needs `<`.' },
      { text: 'A comparison by `minor` first, because the last member is the most significant.', correct: false, why: 'Members are compared in declaration order, so `major` is compared first.' },
      { text: 'Only `==` and `!=`; ordering operators still need to be written by hand.', correct: false, why: 'Equality comes from a defaulted `==`; `<=>` generates the four relational operators.' },
    ],
    explanation: `In C++20 a defaulted \`operator<=>\` performs member-wise three-way comparison in declaration order. The compiler rewrites \`a < b\` as \`(a <=> b) < 0\`, so the type satisfies what \`std::sort\` needs. Declare \`bool operator==(const Version&) const = default;\` as well (it is implicitly generated alongside a defaulted \`<=>\`, but explicit is clearer).`,
  },
  {
    id: 'operators-q06', lang: 'python', type: 'output', difficulty: 2,
    prompt: 'What does this program print?',
    codeLang: 'python',
    code: `class Money:
    def __init__(self, cents):
        self.cents = cents
    def __add__(self, other):
        if isinstance(other, Money):
            return Money(self.cents + other.cents)
        return NotImplemented
    def __radd__(self, other):
        print("radd")
        return Money(self.cents + other)

m = 1 + Money(5)
print(m.cents)`,
    options: [
      { text: 'radd\n6', correct: true, why: '`int.__add__(1, Money)` returns `NotImplemented`, so Python calls `Money.__radd__` with 1 as `other`.' },
      { text: '6', correct: false, why: 'The `print("radd")` inside `__radd__` does run; that is how the reflected method is reached.' },
      { text: 'TypeError', correct: false, why: 'A `TypeError` occurs only when both `__add__` and `__radd__` give up; here `__radd__` handles the int.' },
      { text: 'radd\n5', correct: false, why: '`__radd__` returns `Money(self.cents + other)`, i.e. 5 + 1 = 6.' },
    ],
    explanation: `For \`a + b\` Python calls \`type(a).__add__(a, b)\`. If that returns \`NotImplemented\` (as \`int\` does for a \`Money\`), it tries \`type(b).__radd__(b, a)\`. Only if that also returns \`NotImplemented\` does it raise \`TypeError\`.`,
  },
  {
    id: 'operators-q07', lang: 'python', type: 'concept', difficulty: 2,
    prompt: '`sum([Money(1), Money(2)])` raises `TypeError` although `Money.__add__` works for two `Money`s. Why?',
    options: [
      { text: '`sum` starts from the integer `0`, so the first step is `0 + Money(1)`, which needs `Money.__radd__` (or `start=Money(0)`).', correct: true, why: 'Right. `sum` has a default start of 0, and `int` cannot add a `Money`, so the reflected method is required.' },
      { text: '`sum` only works on numbers and can never accept user-defined types.', correct: false, why: '`sum` accepts anything addable; it just starts from 0 unless you pass `start`.' },
      { text: '`__add__` must also be registered with `functools.total_ordering`.', correct: false, why: '`total_ordering` supplies comparison operators and has nothing to do with addition.' },
      { text: '`sum` calls `__iadd__`, which `Money` does not define.', correct: false, why: '`sum` uses plain `+`; `__iadd__` is for `+=` and falls back to `__add__` anyway.' },
    ],
    explanation: `\`sum(iterable, start=0)\` computes \`start + x1 + x2 ...\`. The first addition is \`0 + Money(1)\`, and \`int.__add__\` returns \`NotImplemented\`, so Python needs \`Money.__radd__\`. The usual trick is \`def __radd__(self, other): return self if other == 0 else self.__add__(other)\`, or call \`sum(items, Money(0))\`.`,
  },
  {
    id: 'operators-q08', lang: 'python', type: 'concept', difficulty: 2,
    prompt: 'What happens when you put an instance of this class into a `set`?',
    codeLang: 'python',
    code: `class Point:
    def __init__(self, x, y):
        self.x, self.y = x, y
    def __eq__(self, other):
        return isinstance(other, Point) and (self.x, self.y) == (other.x, other.y)`,
    options: [
      { text: '`TypeError: unhashable type: \'Point\'`, because defining `__eq__` without `__hash__` sets `__hash__` to `None`.', correct: true, why: 'Right. Python disables the inherited identity hash once you define `__eq__`, to avoid inconsistent hashing.' },
      { text: 'It works and uses the object\'s memory address for hashing as before.', correct: false, why: 'That was true before `__eq__` was defined. Overriding `__eq__` removes the default `__hash__`.' },
      { text: 'It works, and Python computes a hash automatically from `x` and `y`.', correct: false, why: 'Python never derives a hash from attributes for ordinary classes; only dataclasses with the right options do.' },
      { text: 'The `set` silently ignores the object.', correct: false, why: 'Python does not silently drop items; it raises an error if the object cannot be hashed.' },
    ],
    explanation: `A class that overrides \`__eq__\` without defining \`__hash__\` gets \`__hash__ = None\`, making instances unhashable. Add \`def __hash__(self): return hash((self.x, self.y))\` to use them in sets and as dict keys, and keep the fields immutable.`,
  },
  {
    id: 'operators-q09', lang: 'both', type: 'concept', difficulty: 2,
    prompt: 'What is the contract between equality and hashing (for example `__eq__`/`__hash__`, or `==` and a `std::hash` specialization)?',
    options: [
      { text: 'Objects that compare equal must have equal hashes; unequal objects may share a hash.', correct: true, why: 'Right. Hash tables locate a bucket from the hash first and then compare with equality, so equal objects must land in the same bucket.' },
      { text: 'Objects with equal hashes must always compare equal.', correct: false, why: 'Hash collisions are normal and unavoidable; equal hashes only mean "possibly equal".' },
      { text: 'Hashes must be unique for every distinct object.', correct: false, why: 'A hash has a limited number of values, so uniqueness is impossible in general.' },
      { text: 'The hash must be recomputed each time from mutable fields so that it stays current.', correct: false, why: 'A hash that changes while an object is in a set or dict key makes it unfindable; hash immutable state only.' },
    ],
    explanation: `The rule is one-directional: \`a == b\` implies \`hash(a) == hash(b)\`. Collisions are allowed, so lookups still compare with \`==\`. Because the hash is used to place the object, the fields feeding it must not change while the object is stored in a hash-based container.`,
  },
  {
    id: 'operators-q10', lang: 'python', type: 'concept', difficulty: 2,
    prompt: 'With `@total_ordering`, `Version` defines only `__eq__` and `__lt__`. What does `Version(1, 2) >= Version(1, 0)` do?',
    options: [
      { text: 'It works: `total_ordering` derives `__ge__` (and `__le__`, `__gt__`) from `__eq__` and `__lt__`.', correct: true, why: 'Right. The decorator fills in the missing rich comparisons from one ordering method plus equality.' },
      { text: 'It raises `TypeError`, because `>=` must be defined explicitly.', correct: false, why: 'That is what happens without the decorator; `total_ordering` exists to avoid writing all four.' },
      { text: 'It falls back to comparing the object ids.', correct: false, why: 'Python 3 does not order arbitrary objects by id; missing comparisons raise `TypeError`.' },
      { text: 'It works, but only when `__eq__` is also decorated.', correct: false, why: '`total_ordering` is applied once to the class and uses the `__eq__` you wrote.' },
    ],
    explanation: `\`functools.total_ordering\` requires \`__eq__\` and one of \`__lt__\`, \`__le__\`, \`__gt__\`, \`__ge__\` and generates the rest. It is convenient, though the derived methods are slightly slower than hand-written ones.`,
  },
  {
    id: 'operators-q11', lang: 'cpp', type: 'concept', difficulty: 2,
    prompt: 'Why is `std::ostream& operator<<(std::ostream&, const Money&)` normally written as a non-member?',
    options: [
      { text: 'The stream is the left operand, so a member would have to belong to `std::ostream`, which you cannot modify.', correct: true, why: 'Right. A member operator receives the left operand as `*this`; for `os << m` that would be the stream class.' },
      { text: 'Member functions cannot return references.', correct: false, why: 'Members can return references (`operator+=` does exactly that). The problem is the left operand.' },
      { text: 'Non-member operators are faster to call.', correct: false, why: 'Both forms compile to a function call and perform identically.' },
      { text: 'The standard forbids `operator<<` as a member.', correct: false, why: 'There is no such ban; it is simply impossible for your own class to host the stream on its left.' },
    ],
    explanation: `\`os << m\` means \`os.operator<<(m)\` or \`operator<<(os, m)\`. Defining a member of \`Money\` would only support \`m << os\`. So write a free function (declared \`friend\` if it needs private data) and return the stream by reference so \`os << a << b\` chains.`,
  },
  {
    id: 'operators-q12', lang: 'both', type: 'compare', difficulty: 2,
    prompt: 'How do C++ and Python make `2 * v` work for a user-defined `Vec`?',
    options: [
      { text: 'C++ needs a free `operator*(int, const Vec&)`; Python tries `int.__mul__`, gets `NotImplemented`, then calls `Vec.__rmul__`.', correct: true, why: 'Right. C++ looks up a function per written operand order; Python has an explicit reflected-method protocol.' },
      { text: 'Both languages automatically swap the operands when the left one cannot handle the call.', correct: false, why: 'C++ never swaps operands, and Python swaps only via the separate `__r*__` method.' },
      { text: 'C++ uses `__rmul__` too, defined as a member of `Vec`.', correct: false, why: 'C++ has no reflected operators; names like `__rmul__` are Python-only.' },
      { text: 'Python needs a module-level function `rmul(2, v)` registered with the interpreter.', correct: false, why: 'No registration is needed; defining `__rmul__` on the class is enough.' },
    ],
    explanation: `C++ treats \`a * b\` as \`a.operator*(b)\` or \`operator*(a, b)\` with no swapping, so symmetry means writing the second overload (usually in terms of the first). Python dispatches on the left operand first and falls back to the right operand's reflected method, which is why returning \`NotImplemented\` matters.`,
  },
  {
    id: 'operators-q13', lang: 'python', type: 'concept', difficulty: 2,
    prompt: 'A class defines `__len__` but not `__bool__`. What does `if Playlist():` do for a playlist with no songs?',
    options: [
      { text: 'The condition is false, because `bool()` falls back to `__len__` and 0 is falsy.', correct: true, why: 'Right. Truth testing uses `__bool__` first, then `__len__`.' },
      { text: 'The condition is true, since every user-defined object is truthy.', correct: false, why: 'Objects are truthy only by default; a defined `__len__` or `__bool__` changes that.' },
      { text: 'It raises `TypeError`, because `__bool__` is mandatory for `if`.', correct: false, why: '`__bool__` is optional; Python falls back to `__len__` and finally to True.' },
      { text: 'It calls `__eq__` with `None`.', correct: false, why: '`if obj:` performs truth testing, which never calls `__eq__`.' },
    ],
    explanation: `Python's truth testing order is: \`__bool__\`, then \`__len__\`, otherwise true. That is why empty lists, dicts and your own empty containers are falsy. Define \`__bool__\` only if truthiness should differ from "non-empty".`,
  },
  {
    id: 'operators-q14', lang: 'python', type: 'concept', difficulty: 3,
    prompt: 'A class defines only `__getitem__(self, i)` (returning `self._v[i]`). Which statements work?',
    options: [
      { text: '`for x in obj` and `3 in obj` both work: Python calls `__getitem__(0)`, `(1)`, ... until `IndexError`.', correct: true, why: 'Right. This legacy sequence protocol is the fallback when `__iter__` and `__contains__` are missing.' },
      { text: 'Only `obj[0]` works; iteration needs `__iter__`.', correct: false, why: '`iter()` falls back to the sequence protocol built on `__getitem__`.' },
      { text: '`for` works but `in` raises `TypeError`.', correct: false, why: '`in` also falls back to iteration, so it works too.' },
      { text: 'Nothing works until `__len__` is defined.', correct: false, why: '`__len__` is only needed for `len(obj)` and truth testing, not for iteration.' },
    ],
    explanation: `\`iter(obj)\` prefers \`__iter__\`; if it is missing but \`__getitem__\` exists, Python builds an iterator that indexes 0, 1, 2... and stops on \`IndexError\`. \`x in obj\` prefers \`__contains__\`, then falls back to iteration. Define \`__iter__\` and \`__contains__\` explicitly when you want clarity or speed.`,
  },
  {
    id: 'operators-q15', lang: 'cpp', type: 'concept', difficulty: 3,
    prompt: 'Why do container-like classes usually provide both `T& operator[](size_t)` and `const T& operator[](size_t) const`?',
    options: [
      { text: 'The non-const version lets callers modify elements of a mutable object; the const version lets `const` objects be read.', correct: true, why: 'Right. Overloading on constness picks the right one, and a `const` object can only call const members.' },
      { text: 'Two versions are required, otherwise the compiler refuses to overload `[]`.', correct: false, why: 'Nothing forces both; but with only the non-const one, a `const` container cannot be indexed.' },
      { text: 'The const version is called for every read and the non-const only for `delete`.', correct: false, why: 'Selection depends on whether the object is `const`, not on whether the access reads or writes.' },
      { text: 'The const version returns by value so that the copy cannot be modified.', correct: false, why: 'It normally returns `const T&`, which avoids copies and still blocks modification.' },
    ],
    explanation: `Overload resolution on the implicit \`this\` picks the \`const\` overload for const objects and the non-const one otherwise. The non-const overload returns \`T&\` so \`buf[i] = 5\` works; the const overload returns \`const T&\` so a \`const Buffer&\` parameter can be read but not changed. Without the const overload, passing a container by \`const&\` makes \`[]\` unusable.`,
  },
];
