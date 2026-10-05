export default [
  {
    id: 'operators-e01', lang: 'cpp', title: 'A Money value type', difficulty: 2,
    task: `Build a \`Money\` value type that stores whole **cents** in a \`long long\`.

- \`Money(long long dollars = 0, long long cents = 0)\` stores \`dollars * 100 + cents\`; \`long long cents() const\` returns the total number of cents.
- \`Money& operator+=(const Money&)\`, \`operator+\` (built on \`+=\`, must not modify its operands) and \`operator-\` (two \`Money\` values).
- \`operator*\` with a \`long long\` multiplier in **both orders**: \`m * 3\` and \`3 * m\`.
- A defaulted \`operator==\` and a defaulted \`operator<=>\`, so all comparisons work.
- \`operator<<\` prints \`$12.05\`; negative amounts print \`-$3.50\`; cents always have two digits.

~~~cpp
Money a(12, 5), b(3, 50);
std::cout << a + b << "\\n";   // $15.55
std::cout << b - a << "\\n";   // -$8.55
std::cout << 2 * b << "\\n";   // $7.00
a < b;                         // false
~~~`,
    starter: `#include <compare>
#include <ostream>
#include <string>

class Money {
public:
    Money(long long dollars = 0, long long cents = 0) {}  // TODO: store total cents
    long long cents() const { return 0; }
    Money& operator+=(const Money& o) { return *this; }
    friend Money operator+(Money a, const Money& b) { return a; }
    friend Money operator-(const Money& a, const Money& b) { return a; }
    friend Money operator*(Money a, long long k) { return a; }
    friend Money operator*(long long k, Money a) { return a; }
    // TODO: default == and <=>
    bool operator==(const Money&) const { return false; }
    std::strong_ordering operator<=>(const Money&) const { return std::strong_ordering::equal; }
    friend std::ostream& operator<<(std::ostream& os, const Money& m) { return os; }
};
`,
    tests: [
      { name: 'construction and cents()', code: `EXPECT_EQ(Money(12, 5).cents(), 1205LL);
EXPECT_EQ(Money().cents(), 0LL);
EXPECT_EQ(Money(0, 99).cents(), 99LL);` },
      { name: 'addition, subtraction and +=', code: `Money a(12, 5), b(3, 50);
Money c = a + b;
EXPECT_EQ(c.cents(), 1555LL);
EXPECT_EQ(a.cents(), 1205LL);   // operator+ must not modify its operands
EXPECT_EQ((b - a).cents(), -855LL);
a += b;
EXPECT_EQ(a.cents(), 1555LL);
EXPECT_EQ(b.cents(), 350LL);` },
      { name: 'multiplication works in both orders', code: `Money b(3, 50);
EXPECT_EQ((b * 3).cents(), 1050LL);
EXPECT_EQ((3 * b).cents(), 1050LL);
EXPECT_EQ((2 * Money(0, 5)).cents(), 10LL);` },
      { name: 'comparisons', code: `EXPECT(Money(1, 0) == Money(0, 100));
EXPECT(Money(1, 0) != Money(1, 1));
EXPECT(Money(1, 0) < Money(1, 1));
EXPECT(Money(2, 0) > Money(1, 99));
EXPECT(Money(1, 0) <= Money(1, 0));
EXPECT(Money(1, 0) >= Money(0, 99));` },
      { name: 'streaming', code: `EXPECT_EQ(captureCout([&]{ std::cout << Money(12, 5); }), std::string("$12.05"));
EXPECT_EQ(captureCout([&]{ std::cout << Money(0, 7); }), std::string("$0.07"));
EXPECT_EQ(captureCout([&]{ std::cout << Money(-3, -50); }), std::string("-$3.50"));
EXPECT_EQ(captureCout([&]{ std::cout << Money(0, 0); }), std::string("$0.00"));` },
    ],
    hints: [
      'Store one \`long long cents_\` and compute \`dollars * 100 + cents\` in the constructor. Write \`+=\` first.',
      'Take the left operand of \`operator+\` by value: \`friend Money operator+(Money a, const Money& b) { a += b; return a; }\`. For \`3 * m\`, add a second friend that calls \`m * 3\`.',
      'For \`operator<<\` take \`long long c = m.cents_\`; if negative, print \`-\` and negate. Print \`c / 100\`, a dot, and \`c % 100\` padded to two digits (build a string).',
    ],
    solution: `#include <compare>
#include <ostream>
#include <string>

class Money {
    long long cents_;
public:
    Money(long long dollars = 0, long long cents = 0) : cents_(dollars * 100 + cents) {}
    long long cents() const { return cents_; }

    Money& operator+=(const Money& o) { cents_ += o.cents_; return *this; }
    friend Money operator+(Money a, const Money& b) { a += b; return a; }
    friend Money operator-(Money a, const Money& b) { a.cents_ -= b.cents_; return a; }
    friend Money operator*(Money a, long long k) { a.cents_ *= k; return a; }
    friend Money operator*(long long k, Money a) { return a * k; }

    bool operator==(const Money&) const = default;
    auto operator<=>(const Money&) const = default;

    friend std::ostream& operator<<(std::ostream& os, const Money& m) {
        long long c = m.cents_;
        if (c < 0) { os << '-'; c = -c; }
        std::string frac = std::to_string(c % 100);
        if (frac.size() < 2) frac = "0" + frac;
        return os << '$' << c / 100 << '.' << frac;
    }
};
`,
    explanation: `**One mutating primitive.** \`operator+=\` is the only place that adds cents. \`operator+\` takes its left operand **by value**, so it already holds a private copy: it applies \`+=\` to the copy and returns it, leaving the caller's objects untouched. \`operator-\` and \`operator*\` use the same copy-by-value trick.

**Symmetry needs two overloads.** \`m * 3\` could be a member, but \`3 * m\` cannot, so both are friend functions and the second just forwards to the first.

**Free comparison.** \`= default\` for \`==\` and \`<=>\` compares the single \`cents_\` member, which produces all six comparison operators. **\`operator<<\`** is a non-member because the stream is the left operand; it returns the stream so calls chain. This is value semantics: a small type that behaves like a built-in number.`,
  },
  {
    id: 'operators-e02', lang: 'cpp', title: 'A 2x2 matrix', difficulty: 2,
    task: `Write \`class Matrix2\`, a 2x2 matrix of \`int\`s stored row by row.

- \`Matrix2(int a, int b, int c, int d)\` builds \`[[a, b], [c, d]]\`.
- \`int& operator()(int r, int c)\` and \`const int& operator()(int r, int c) const\` access row \`r\`, column \`c\` (both 0 or 1).
- \`Matrix2 operator*(const Matrix2&) const\` is the matrix product.
- \`bool operator==(const Matrix2&) const\`.
- \`operator<<\` prints \`[[1, 2], [3, 4]]\`.

~~~cpp
Matrix2 m(1, 2, 3, 4);
m(0, 1);               // 2
m(1, 0) = 9;           // writes through the reference
std::cout << m * m;    // [[1, 2], [3, 4]] times itself
~~~`,
    starter: `#include <array>
#include <ostream>

class Matrix2 {
    std::array<int, 4> d_{};
public:
    Matrix2(int a, int b, int c, int d) {}  // TODO
    int& operator()(int r, int c) { return d_[0]; }
    const int& operator()(int r, int c) const { return d_[0]; }
    Matrix2 operator*(const Matrix2& o) const { return *this; }
    bool operator==(const Matrix2& o) const { return false; }
};

std::ostream& operator<<(std::ostream& os, const Matrix2& m) { return os; }
`,
    tests: [
      { name: 'element access', code: `Matrix2 m(1, 2, 3, 4);
EXPECT_EQ(m(0, 0), 1);
EXPECT_EQ(m(0, 1), 2);
EXPECT_EQ(m(1, 0), 3);
EXPECT_EQ(m(1, 1), 4);` },
      { name: 'writing through operator()', code: `Matrix2 m(1, 2, 3, 4);
m(1, 0) = 9;
EXPECT_EQ(m(1, 0), 9);
const Matrix2 k(5, 6, 7, 8);
EXPECT_EQ(k(1, 1), 8);` },
      { name: 'matrix product', code: `Matrix2 a(1, 2, 3, 4), b(5, 6, 7, 8);
Matrix2 p = a * b;
EXPECT_EQ(p(0, 0), 19);
EXPECT_EQ(p(0, 1), 22);
EXPECT_EQ(p(1, 0), 43);
EXPECT_EQ(p(1, 1), 50);
Matrix2 id(1, 0, 0, 1);
EXPECT(a * id == a);` },
      { name: 'equality and printing', code: `EXPECT(Matrix2(1, 2, 3, 4) == Matrix2(1, 2, 3, 4));
EXPECT(!(Matrix2(1, 2, 3, 4) == Matrix2(1, 2, 3, 5)));
EXPECT_EQ(captureCout([&]{ std::cout << Matrix2(1, 2, 3, 4); }), std::string("[[1, 2], [3, 4]]"));` },
    ],
    hints: [
      'Store the four values in a \`std::array<int, 4>\`; element (r, c) is at index \`r * 2 + c\`.',
      'Both \`operator()\` overloads return \`d_[r * 2 + c]\`; the const one is a \`const\` member returning \`const int&\`.',
      'The product entry (i, j) is \`(*this)(i, 0) * o(0, j) + (*this)(i, 1) * o(1, j)\`. \`operator==\` can be \`= default\`.',
    ],
    solution: `#include <array>
#include <ostream>

class Matrix2 {
    std::array<int, 4> d_{};
public:
    Matrix2(int a, int b, int c, int d) : d_{a, b, c, d} {}
    int& operator()(int r, int c) { return d_[r * 2 + c]; }
    const int& operator()(int r, int c) const { return d_[r * 2 + c]; }

    Matrix2 operator*(const Matrix2& o) const {
        Matrix2 r(0, 0, 0, 0);
        for (int i = 0; i < 2; ++i)
            for (int j = 0; j < 2; ++j)
                r(i, j) = (*this)(i, 0) * o(0, j) + (*this)(i, 1) * o(1, j);
        return r;
    }
    bool operator==(const Matrix2&) const = default;
};

std::ostream& operator<<(std::ostream& os, const Matrix2& m) {
    return os << "[[" << m(0, 0) << ", " << m(0, 1) << "], ["
              << m(1, 0) << ", " << m(1, 1) << "]]";
}
`,
    explanation: `**\`operator()\` as an accessor.** C++ has no multi-argument \`operator[]\` before C++23, so \`m(r, c)\` is the idiomatic spelling. Two overloads, one \`const\`, let a mutable matrix be written through (\`m(1,0) = 9\`) and a \`const Matrix2&\` be read.

**\`operator*\` does not modify either operand.** It builds a fresh result and fills it through the non-const accessor. \`operator==\` is defaulted: the \`std::array\` member already knows how to compare element by element.

**\`operator<<\`** is a free function because the stream is on the left, and it returns the stream so output can be chained. Each operator keeps its conventional meaning, which is the restraint that makes overloading worthwhile.`,
  },
  {
    id: 'operators-e03', lang: 'python', title: 'A Vector with dunders', difficulty: 2,
    task: `Write \`class Vector\` that behaves like a small immutable numeric vector.

- \`Vector(*components)\`; \`repr\` is \`Vector(1, 2, 3)\`.
- \`+\` and \`-\` between vectors; raise \`ValueError\` if the dimensions differ. Return \`NotImplemented\` for non-vectors.
- \`*\` and \`__rmul__\` with a scalar (\`int\` or \`float\`): \`2 * v\` and \`v * 2\`.
- \`==\` compares components (non-vectors give \`NotImplemented\`) and \`__hash__\` agrees with it.
- \`len(v)\`, iteration, \`v[i]\`, \`abs(v)\` (Euclidean length) and \`bool(v)\` (\`False\` only for the zero vector).

~~~python
v = Vector(3, 4)
abs(v)          # 5.0
2 * v           # Vector(6, 8)
v + Vector(1, 1)  # Vector(4, 5)
bool(Vector(0, 0))  # False
~~~`,
    starter: `class Vector:
    def __init__(self, *components):
        raise NotImplementedError

    def __repr__(self):
        raise NotImplementedError

    def __add__(self, other):
        raise NotImplementedError

    def __sub__(self, other):
        raise NotImplementedError

    def __mul__(self, k):
        raise NotImplementedError

    def __rmul__(self, k):
        raise NotImplementedError

    def __eq__(self, other):
        raise NotImplementedError

    def __hash__(self):
        raise NotImplementedError

    def __len__(self):
        raise NotImplementedError

    def __iter__(self):
        raise NotImplementedError

    def __getitem__(self, i):
        raise NotImplementedError

    def __abs__(self):
        raise NotImplementedError

    def __bool__(self):
        raise NotImplementedError
`,
    tests: [
      { name: 'repr, len, indexing, iteration', code: `v = Vector(1, 2, 3)
assert repr(v) == "Vector(1, 2, 3)", repr(v)
assert len(v) == 3
assert v[0] == 1 and v[2] == 3
assert list(v) == [1, 2, 3]` },
      { name: 'addition and subtraction', code: `a, b = Vector(1, 2), Vector(10, 20)
assert a + b == Vector(11, 22)
assert b - a == Vector(9, 18)
assert a == Vector(1, 2), "operands must not change"
try:
    a + Vector(1, 2, 3)
    assert False, "different dimensions must raise ValueError"
except ValueError:
    pass
assert a.__add__(5) is NotImplemented` },
      { name: 'scalar multiplication in both orders', code: `v = Vector(1, 2)
assert v * 3 == Vector(3, 6)
assert 3 * v == Vector(3, 6)
assert 0.5 * Vector(4, 6) == Vector(2.0, 3.0)` },
      { name: 'equality and hashing', code: `assert Vector(1, 2) == Vector(1, 2)
assert Vector(1, 2) != Vector(2, 1)
assert Vector(1, 2) != (1, 2)
assert hash(Vector(1, 2)) == hash(Vector(1, 2))
assert len({Vector(1, 2), Vector(1, 2), Vector(3, 4)}) == 2` },
      { name: 'abs and bool', code: `assert abs(Vector(3, 4)) == 5.0
assert bool(Vector(0, 1)) is True
assert bool(Vector(0, 0)) is False
assert not Vector()` },
    ],
    hints: [
      'Keep the components in a tuple, \`self._c = tuple(components)\`, and delegate \`__len__\`, \`__iter__\` and \`__getitem__\` to it.',
      'In \`__add__\` check \`isinstance(other, Vector)\` first (return \`NotImplemented\` if not), then compare lengths, then build a new \`Vector\` from \`zip\`. \`__rmul__\` can simply return \`self * k\`.',
      '\`__eq__\` compares \`self._c == other._c\`; \`__hash__\` is \`hash(self._c)\`; \`__abs__\` is \`math.sqrt(sum(x * x for x in self._c))\`; \`__bool__\` is \`any(self._c)\`.',
    ],
    solution: `import math


class Vector:
    def __init__(self, *components):
        self._c = tuple(components)

    def __repr__(self):
        return f"Vector({', '.join(map(repr, self._c))})"

    def _check(self, other):
        if len(self) != len(other):
            raise ValueError("dimension mismatch")

    def __add__(self, other):
        if not isinstance(other, Vector):
            return NotImplemented
        self._check(other)
        return Vector(*(a + b for a, b in zip(self._c, other._c)))

    def __sub__(self, other):
        if not isinstance(other, Vector):
            return NotImplemented
        self._check(other)
        return Vector(*(a - b for a, b in zip(self._c, other._c)))

    def __mul__(self, k):
        if not isinstance(k, (int, float)):
            return NotImplemented
        return Vector(*(a * k for a in self._c))

    def __rmul__(self, k):
        return self * k

    def __eq__(self, other):
        if not isinstance(other, Vector):
            return NotImplemented
        return self._c == other._c

    def __hash__(self):
        return hash(self._c)

    def __len__(self):
        return len(self._c)

    def __iter__(self):
        return iter(self._c)

    def __getitem__(self, i):
        return self._c[i]

    def __abs__(self):
        return math.sqrt(sum(x * x for x in self._c))

    def __bool__(self):
        return any(self._c)
`,
    explanation: `**Operators build new objects.** \`__add__\`, \`__sub__\` and \`__mul__\` return fresh \`Vector\`s and never touch \`self\`. Returning \`NotImplemented\` for foreign types lets Python try the other operand and finally raise \`TypeError\`, instead of failing with an obscure attribute error.

**Symmetry through \`__rmul__\`.** \`2 * v\` first tries \`int.__mul__\`, which declines, so Python calls \`v.__rmul__(2)\`, which reuses \`__mul__\`.

**Equality and hash agree.** \`__eq__\` and \`__hash__\` both use the tuple of components, and the tuple is immutable, so instances are safe in sets and as dict keys. \`__len__\`, \`__iter__\` and \`__getitem__\` give the container protocol; \`__bool__\` overrides the default "non-empty is truthy" rule so the zero vector is falsy.`,
  },
  {
    id: 'operators-e04', lang: 'python', title: 'Money with total ordering', difficulty: 3,
    task: `Write \`Money(cents, currency="USD")\` using \`functools.total_ordering\`.

- Attributes \`cents\` (int) and \`currency\` (str).
- \`__eq__\` and \`__lt__\` return \`NotImplemented\` when the other object is not a \`Money\` **or** has a different currency. So \`Money(1) < Money(1, "EUR")\` raises \`TypeError\` and \`Money(1) == Money(1, "EUR")\` is \`False\`. Decorate the class with \`@total_ordering\` so \`<=\`, \`>\`, \`>=\` work.
- \`__add__\` (same currency, else \`NotImplemented\`) returns a new \`Money\`; \`__radd__\` accepts the int \`0\` so that \`sum(list_of_money)\` works.
- \`__hash__\` consistent with \`__eq__\`; \`__str__\` returns \`"12.05 USD"\`; \`__repr__\` returns \`Money(1205, 'USD')\`.

~~~python
sum([Money(150), Money(275)])   # Money(425, 'USD')
str(Money(1205))                # '12.05 USD'
Money(100) >= Money(99)         # True
~~~`,
    starter: `from functools import total_ordering


class Money:
    def __init__(self, cents, currency="USD"):
        raise NotImplementedError

    def __eq__(self, other):
        raise NotImplementedError

    def __lt__(self, other):
        raise NotImplementedError

    def __hash__(self):
        raise NotImplementedError

    def __add__(self, other):
        raise NotImplementedError

    def __radd__(self, other):
        raise NotImplementedError

    def __str__(self):
        raise NotImplementedError

    def __repr__(self):
        raise NotImplementedError
`,
    tests: [
      { name: 'ordering from total_ordering', code: `a, b = Money(100), Money(250)
assert a < b and a <= b and b > a and b >= a
assert not (a > b)
assert Money(100) >= Money(100) and Money(100) <= Money(100)` },
      { name: 'different currencies do not compare', code: `usd, eur = Money(100), Money(100, "EUR")
assert usd != eur
assert not (usd == eur)
try:
    usd < eur
    assert False, "ordering across currencies must raise TypeError"
except TypeError:
    pass
assert usd.__lt__(eur) is NotImplemented` },
      { name: 'addition and sum()', code: `total = Money(150) + Money(275)
assert total == Money(425)
assert sum([Money(150), Money(275), Money(5)]) == Money(430)
assert sum([Money(1, "EUR"), Money(2, "EUR")]) == Money(3, "EUR")
try:
    Money(1) + Money(1, "EUR")
    assert False, "mixed currencies must raise TypeError"
except TypeError:
    pass` },
      { name: 'hash, str and repr', code: `assert hash(Money(5)) == hash(Money(5))
assert len({Money(5), Money(5), Money(5, "EUR")}) == 2
assert str(Money(1205)) == "12.05 USD"
assert str(Money(7, "EUR")) == "0.07 EUR"
assert repr(Money(1205)) == "Money(1205, 'USD')"` },
    ],
    hints: [
      'Put \`@total_ordering\` above \`class Money:\` and define only \`__eq__\` and \`__lt__\`.',
      'Both comparisons start with \`if not isinstance(other, Money) or other.currency != self.currency: return NotImplemented\`.',
      '\`__radd__\` can be \`return self if other == 0 else NotImplemented\`. For \`__str__\` use \`f"{self.cents // 100}.{self.cents % 100:02d} {self.currency}"\`.',
    ],
    solution: `from functools import total_ordering


@total_ordering
class Money:
    def __init__(self, cents, currency="USD"):
        self.cents = cents
        self.currency = currency

    def _comparable(self, other):
        return isinstance(other, Money) and other.currency == self.currency

    def __eq__(self, other):
        if not self._comparable(other):
            return NotImplemented
        return self.cents == other.cents

    def __lt__(self, other):
        if not self._comparable(other):
            return NotImplemented
        return self.cents < other.cents

    def __hash__(self):
        return hash((self.cents, self.currency))

    def __add__(self, other):
        if not self._comparable(other):
            return NotImplemented
        return Money(self.cents + other.cents, self.currency)

    def __radd__(self, other):
        if other == 0:  # sum() starts from the int 0
            return self
        return NotImplemented

    def __str__(self):
        return f"{self.cents // 100}.{self.cents % 100:02d} {self.currency}"

    def __repr__(self):
        return f"Money({self.cents}, {self.currency!r})"
`,
    explanation: `**\`NotImplemented\` is the polite refusal.** Returning it from \`__eq__\` and \`__lt__\` for other currencies lets Python try the reflected operation and then fall back: \`==\` becomes \`False\`, while \`<\` raises \`TypeError\`, which is the right outcome for meaningless comparisons. \`total_ordering\` derives \`<=\`, \`>\` and \`>=\` from \`__eq__\` and \`__lt__\`, and because those return \`NotImplemented\`, the derived methods refuse too.

**\`sum()\` and \`__radd__\`.** \`sum\` starts at the int \`0\`, so the first step is \`0 + Money(...)\`; \`__radd__\` accepts exactly that 0 and returns the money unchanged.

**Hash matches equality.** The hash uses the same two fields as \`__eq__\`. \`__str__\` is for users, \`__repr__\` for developers.`,
  },
];
