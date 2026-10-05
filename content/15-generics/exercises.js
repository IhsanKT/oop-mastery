export default [
  {
    id: 'generics-e01', lang: 'cpp', title: 'A generic Stack<T>', difficulty: 1,
    task: `Write a class template \`template <typename T> class Stack\` backed by a \`std::vector<T>\`.

- \`void push(const T& v)\`
- \`T pop()\` removes and returns the top element; throws \`std::out_of_range\` when empty.
- \`T& top()\` and \`const T& top() const\`; both throw \`std::out_of_range\` when empty.
- \`std::size_t size() const\` and \`bool empty() const\`.

~~~cpp
Stack<std::string> s;
s.push("a"); s.push("b");
s.pop();      // "b"
s.size();     // 1
~~~`,
    starter: `#include <cstddef>
#include <stdexcept>
#include <vector>

template <typename T>
class Stack {
    std::vector<T> items_;
public:
    void push(const T& v) { (void)v; }
    T pop() { return T{}; }
    T& top() { static T dummy{}; return dummy; }
    const T& top() const { static T dummy{}; return dummy; }
    std::size_t size() const { return 0; }
    bool empty() const { return true; }
};
`,
    tests: [
      { name: 'int stack is LIFO', code: `Stack<int> s;
EXPECT(s.empty());
s.push(1); s.push(2); s.push(3);
EXPECT_EQ(s.size(), std::size_t(3));
EXPECT_EQ(s.top(), 3);
EXPECT_EQ(s.pop(), 3);
EXPECT_EQ(s.pop(), 2);
EXPECT_EQ(s.size(), std::size_t(1));
EXPECT(!s.empty());` },
      { name: 'string stack', code: `Stack<std::string> s;
s.push("alpha"); s.push("beta");
EXPECT_EQ(s.pop(), std::string("beta"));
EXPECT_EQ(s.top(), std::string("alpha"));
s.top() = "gamma";
EXPECT_EQ(s.pop(), std::string("gamma"));
EXPECT(s.empty());` },
      { name: 'empty stack throws', code: `Stack<int> s;
EXPECT_THROWS(s.pop(), std::out_of_range);
EXPECT_THROWS(s.top(), std::out_of_range);
s.push(5);
s.pop();
EXPECT_THROWS(s.pop(), std::out_of_range);` },
      { name: 'const top', code: `Stack<int> s;
s.push(9);
const Stack<int>& cs = s;
EXPECT_EQ(cs.top(), 9);
Stack<int> e;
const Stack<int>& ce = e;
EXPECT_THROWS(ce.top(), std::out_of_range);` },
    ],
    hints: [
      'Each member is a one-liner on items_ (push_back, back, pop_back, size, empty); the only extra is checking for emptiness first.',
      'Write pop as: if (items_.empty()) throw std::out_of_range("empty stack"); T v = std::move(items_.back()); items_.pop_back(); return v; (add #include <utility>). top() checks the same way and returns items_.back().',
    ],
    solution: `#include <cstddef>
#include <stdexcept>
#include <utility>
#include <vector>

template <typename T>
class Stack {
    std::vector<T> items_;
public:
    void push(const T& v) { items_.push_back(v); }
    T pop() {
        if (items_.empty()) throw std::out_of_range("empty stack");
        T v = std::move(items_.back());
        items_.pop_back();
        return v;
    }
    T& top() {
        if (items_.empty()) throw std::out_of_range("empty stack");
        return items_.back();
    }
    const T& top() const {
        if (items_.empty()) throw std::out_of_range("empty stack");
        return items_.back();
    }
    std::size_t size() const { return items_.size(); }
    bool empty() const { return items_.empty(); }
};
`,
    explanation: `**One definition, many types.** \`Stack<int>\` and \`Stack<std::string>\` are two separate classes generated from the same template; each is fully type-checked with no run-time overhead. Nothing in the class names a concrete element type, only \`T\`.

**Const-correct overloads.** \`top()\` has a const and a non-const version, as in the standard containers, so a \`const Stack&\` can still be read. Throwing \`std::out_of_range\` for empty access gives callers a clear error instead of undefined behavior. In Python, a single \`Stack\` class serves every type through duck typing.`,
  },
  {
    id: 'generics-e02', lang: 'cpp', title: 'CRTP Comparable mixin', difficulty: 3,
    task: `Use CRTP to derive four comparison operators from two.

- \`template <typename Derived> struct Comparable\` defines these **hidden friends** taking \`const Derived&\`: \`operator!=\` (from \`==\`), \`operator>\` (from \`<\`), \`operator<=\` and \`operator>=\` (both from \`<\`).
- \`struct Version : Comparable<Version>\` has public \`int major, minor;\`, a constructor \`Version(int major, int minor)\`, and friend \`operator==\` (both fields equal) and \`operator<\` (lexicographic by major, then minor).

~~~cpp
Version a(1, 2), b(1, 5);
a < b;    // true
b >= a;   // true, provided by Comparable
~~~`,
    starter: `template <typename Derived>
struct Comparable {
    friend bool operator!=(const Derived& a, const Derived& b) { (void)a; (void)b; return false; }
    friend bool operator>(const Derived& a, const Derived& b) { (void)a; (void)b; return false; }
    friend bool operator<=(const Derived& a, const Derived& b) { (void)a; (void)b; return false; }
    friend bool operator>=(const Derived& a, const Derived& b) { (void)a; (void)b; return false; }
};

struct Version : Comparable<Version> {
    int major, minor;
    Version(int major, int minor) : major(major), minor(minor) {}
    friend bool operator==(const Version& a, const Version& b) { return false; }
    friend bool operator<(const Version& a, const Version& b) { return false; }
};
`,
    tests: [
      { name: 'uses CRTP', code: `EXPECT((std::is_base_of_v<Comparable<Version>, Version>));
EXPECT(!std::is_polymorphic_v<Version>);` },
      { name: '== and < on Version', code: `Version a(1, 2), b(1, 5), c(1, 2), d(0, 9);
EXPECT(a == c);
EXPECT(!(a == b));
EXPECT(a < b);
EXPECT(d < a);
EXPECT(!(b < a));` },
      { name: 'derived operators', code: `Version a(1, 2), b(1, 5), c(1, 2);
EXPECT(a != b);
EXPECT(!(a != c));
EXPECT(b > a);
EXPECT(!(a > b));
EXPECT(!(a > c));` },
      { name: 'less-equal and greater-equal', code: `Version a(1, 2), b(1, 5), c(1, 2);
EXPECT(a <= b);
EXPECT(a <= c);
EXPECT(!(b <= a));
EXPECT(b >= a);
EXPECT(a >= c);
EXPECT(!(a >= b));` },
    ],
    hints: [
      'Define each operator in terms of the two you supply: != is !(a == b), > is (b < a), <= is !(b < a), >= is !(a < b).',
      'For Version, operator< can be written as: if (a.major != b.major) return a.major < b.major; return a.minor < b.minor; and operator== as a.major == b.major && a.minor == b.minor.',
    ],
    solution: `template <typename Derived>
struct Comparable {
    friend bool operator!=(const Derived& a, const Derived& b) { return !(a == b); }
    friend bool operator>(const Derived& a, const Derived& b) { return b < a; }
    friend bool operator<=(const Derived& a, const Derived& b) { return !(b < a); }
    friend bool operator>=(const Derived& a, const Derived& b) { return !(a < b); }
};

struct Version : Comparable<Version> {
    int major, minor;
    Version(int major, int minor) : major(major), minor(minor) {}
    friend bool operator==(const Version& a, const Version& b) {
        return a.major == b.major && a.minor == b.minor;
    }
    friend bool operator<(const Version& a, const Version& b) {
        if (a.major != b.major) return a.major < b.major;
        return a.minor < b.minor;
    }
};
`,
    explanation: `**A mixin through CRTP.** \`Comparable<Derived>\` is templated on the class that inherits from it, so its friend operators can take \`const Derived&\` and use the derived class's \`==\` and \`<\` directly. The compiler resolves everything statically: no virtual functions, no vtable, and \`Version\` stays a plain two-int struct (the test confirms it is not polymorphic).

**Write two, get four.** This is the same idea as Python's \`functools.total_ordering\`, which fills in the other comparisons from \`__eq__\` and \`__lt__\`. The trade-off against virtual dispatch is that different \`Derived\` types share no common base.

(In C++20 you could instead default \`operator<=>\`; the CRTP version shows the pattern.)`,
  },
  {
    id: 'generics-e03', lang: 'python', title: 'A generic Stack', difficulty: 1,
    task: `Write a generic stack class.

- \`class Stack(Generic[T])\` with \`T = TypeVar("T")\`.
- \`push(item)\`
- \`pop()\` removes and returns the top; raises \`IndexError("pop from empty stack")\` when empty.
- \`peek()\` returns the top without removing it; raises \`IndexError("peek at empty stack")\` when empty.
- \`__len__\` and \`__iter__\`; iteration goes from the **top** to the bottom.

~~~python
s: Stack[int] = Stack()
s.push(1); s.push(2)
list(s)     # [2, 1]
len(s)      # 2
~~~`,
    starter: `from typing import Generic, TypeVar

T = TypeVar("T")


class Stack(Generic[T]):
    def __init__(self):
        raise NotImplementedError

    def push(self, item):
        raise NotImplementedError

    def pop(self):
        raise NotImplementedError

    def peek(self):
        raise NotImplementedError

    def __len__(self):
        raise NotImplementedError

    def __iter__(self):
        raise NotImplementedError
`,
    tests: [
      { name: 'is generic', code: `from typing import Generic
assert Generic in Stack.__mro__, "Stack must derive from Generic[T]"
s = Stack[int]()
s.push(1)
assert len(s) == 1` },
      { name: 'push, pop, peek', code: `s = Stack()
s.push("a"); s.push("b")
assert s.peek() == "b"
assert len(s) == 2
assert s.pop() == "b"
assert s.pop() == "a"
assert len(s) == 0` },
      { name: 'iteration is top first', code: `s = Stack()
for x in (1, 2, 3):
    s.push(x)
assert list(s) == [3, 2, 1]
assert len(s) == 3, "iterating must not remove items"` },
      { name: 'empty errors', code: `s = Stack()
for op, msg in ((s.pop, "pop from empty stack"), (s.peek, "peek at empty stack")):
    try:
        op()
        assert False, "should raise IndexError"
    except IndexError as e:
        assert str(e) == msg, "unexpected message: " + str(e)` },
    ],
    hints: [
      'Keep a private list in __init__ and use append and pop on it; the top is the end of the list.',
      'Check "if not self._items: raise IndexError(...)" in pop and peek. For __iter__, return iter(reversed(self._items)).',
    ],
    solution: `from typing import Generic, TypeVar

T = TypeVar("T")


class Stack(Generic[T]):
    def __init__(self):
        self._items: list[T] = []

    def push(self, item: T) -> None:
        self._items.append(item)

    def pop(self) -> T:
        if not self._items:
            raise IndexError("pop from empty stack")
        return self._items.pop()

    def peek(self) -> T:
        if not self._items:
            raise IndexError("peek at empty stack")
        return self._items[-1]

    def __len__(self) -> int:
        return len(self._items)

    def __iter__(self):
        return iter(reversed(self._items))
`,
    explanation: `**Generic by declaration.** \`Generic[T]\` tells type checkers that \`Stack[int]\` holds ints, so \`push("x")\` on a \`Stack[int]\` is flagged by mypy or pyright. At run time nothing is enforced; the class is generic simply because Python is dynamically typed.

**Protocols make it feel built in.** \`__len__\` and \`__iter__\` let \`len(s)\`, \`for x in s\` and \`list(s)\` work, and \`reversed\` yields a lazy view, so iterating does not modify the stack. The C++ version of this class is \`template <typename T> class Stack\`, with the compiler enforcing the element type.`,
  },
  {
    id: 'generics-e04', lang: 'python', title: 'largest() with a bounded TypeVar', difficulty: 2,
    task: `Write a generic \`largest\` function.

- \`T = TypeVar("T", bound=SupportsLessThan)\` where \`SupportsLessThan\` is a \`Protocol\` with \`__lt__(self, other) -> bool\`.
- \`def largest(items: Iterable[T], key=None) -> T\` returns the largest item. With \`key\`, items are compared by \`key(item)\`. On ties the **first** largest item wins.
- It must raise \`ValueError\` on empty input, work on any iterable (including generators) and rely only on \`<\`, so custom classes defining just \`__lt__\` work.

~~~python
largest([3, 9, 4])                 # 9
largest(["pear", "fig"], key=len)  # "pear"
~~~`,
    starter: `from typing import Iterable, Protocol, TypeVar


class SupportsLessThan(Protocol):
    def __lt__(self, other, /) -> bool: ...


T = TypeVar("T", bound=SupportsLessThan)


def largest(items: Iterable[T], key=None) -> T:
    raise NotImplementedError
`,
    tests: [
      { name: 'numbers and strings', code: `assert largest([3, 9, 4]) == 9
assert largest([2.5, -1.0]) == 2.5
assert largest(["pear", "apple", "zebra"]) == "zebra"` },
      { name: 'key function and ties', code: `assert largest(["pear", "fig", "banana"], key=len) == "banana"
assert largest(["ab", "cd"], key=len) == "ab", "first largest wins on ties"` },
      { name: 'custom class with only __lt__', code: `class Money:
    def __init__(self, c):
        self.c = c
    def __lt__(self, other):
        return self.c < other.c
best = largest([Money(5), Money(50), Money(7)])
assert best.c == 50` },
      { name: 'empty and generators', code: `try:
    largest([])
    assert False, "empty input must raise ValueError"
except ValueError:
    pass
assert largest(x * x for x in range(5)) == 16
try:
    largest(iter(()))
    assert False, "empty iterator must raise ValueError"
except ValueError:
    pass` },
    ],
    hints: [
      'Take an iterator with it = iter(items) and call next(it) for the first candidate; catch StopIteration and raise ValueError.',
      'Loop over the rest, computing k = key(x) if key else x, and replace the best only when best_key < k (strict, so the first wins ties). Never use > or max() with unorderable assumptions: use < only.',
    ],
    solution: `from typing import Iterable, Protocol, TypeVar


class SupportsLessThan(Protocol):
    def __lt__(self, other, /) -> bool: ...


T = TypeVar("T", bound=SupportsLessThan)


def largest(items: Iterable[T], key=None) -> T:
    it = iter(items)
    try:
        best = next(it)
    except StopIteration:
        raise ValueError("largest() of empty input") from None
    best_key = key(best) if key else best
    for x in it:
        k = key(x) if key else x
        if best_key < k:
            best, best_key = x, k
    return best
`,
    explanation: `**A bound as a contract.** \`SupportsLessThan\` is a \`Protocol\`: any class with \`__lt__\` qualifies without inheriting, which is the structural cousin of a C++20 concept like \`std::totally_ordered\`. The shared \`T\` tells a checker that \`largest([1, 2])\` returns an \`int\`.

**Rely on the minimum.** The loop uses only \`<\`, the one operation the protocol promises. Pulling the first item with \`next(it)\` works for generators, which can be traversed only once, and \`from None\` hides the internal \`StopIteration\` behind a clean \`ValueError\`. The bound is enforced by static tools only; the interpreter simply calls \`<\`.`,
  },
];
