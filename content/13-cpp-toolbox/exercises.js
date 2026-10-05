export default [
  {
    id: 'cpp-toolbox-e01', lang: 'cpp', title: 'A const-correct Polygon with a cache', difficulty: 2,
    task: `Build a polygon that caches its perimeter.

- \`struct Point { double x; double y; };\`
- \`class Polygon\` with \`void addPoint(double x, double y)\`, \`std::size_t size() const\`, \`double perimeter() const\` and \`int computations() const\`.
- \`perimeter()\` is the sum of the distances between consecutive points **plus the closing edge** from the last point back to the first; it is \`0\` with fewer than 2 points.
- The result is cached in a \`mutable std::optional<double>\`. Each real computation increments a \`mutable int\` counter returned by \`computations()\`. \`addPoint()\` invalidates the cache.
- All accessors must be callable on a \`const Polygon&\`.

~~~cpp
Polygon p;
p.addPoint(0, 0); p.addPoint(3, 0); p.addPoint(3, 4);
const Polygon& cp = p;
cp.perimeter();      // 12 (computed)
cp.perimeter();      // 12 (cached)
~~~`,
    starter: `#include <cstddef>
#include <cmath>
#include <optional>
#include <vector>

struct Point { double x; double y; };

class Polygon {
public:
    void addPoint(double x, double y) { (void)x; (void)y; }
    std::size_t size() const { return 0; }
    double perimeter() const { return -1; }
    int computations() const { return 0; }
};
`,
    tests: [
      { name: 'size on const reference', code: `Polygon p; p.addPoint(0,0); p.addPoint(3,0);
const Polygon& cp = p;
EXPECT_EQ(cp.size(), std::size_t(2));` },
      { name: 'perimeter of a 3-4-5 triangle', code: `Polygon p; p.addPoint(0,0); p.addPoint(3,0); p.addPoint(3,4);
const Polygon& cp = p;
EXPECT_NEAR(cp.perimeter(), 12.0, 1e-9);` },
      { name: 'cached until invalidated', code: `Polygon p; p.addPoint(0,0); p.addPoint(3,0); p.addPoint(3,4);
const Polygon& cp = p;
cp.perimeter(); cp.perimeter(); cp.perimeter();
EXPECT_EQ(cp.computations(), 1);
p.addPoint(0,4);
EXPECT_NEAR(cp.perimeter(), 14.0, 1e-9);
EXPECT_EQ(cp.computations(), 2);` },
      { name: 'fewer than two points', code: `Polygon p;
EXPECT_NEAR(p.perimeter(), 0.0, 1e-9);
p.addPoint(1,1);
EXPECT_NEAR(p.perimeter(), 0.0, 1e-9);` },
    ],
    hints: [
      'Declare the cache as `mutable std::optional<double> cache_;` and the counter as `mutable int count_ = 0;` so const methods may change them.',
      'In `perimeter() const`, return `*cache_` if it has a value; otherwise sum `std::hypot` over each point and its successor (use `(i + 1) % n`), store it, and increment the counter. `addPoint` must call `cache_.reset()`.',
    ],
    solution: `#include <cstddef>
#include <cmath>
#include <optional>
#include <vector>

struct Point { double x; double y; };

class Polygon {
    std::vector<Point> pts_;
    mutable std::optional<double> cache_;
    mutable int count_ = 0;
public:
    void addPoint(double x, double y) {
        pts_.push_back({x, y});
        cache_.reset();
    }
    std::size_t size() const { return pts_.size(); }
    double perimeter() const {
        if (cache_) return *cache_;
        double sum = 0;
        const std::size_t n = pts_.size();
        if (n >= 2) {
            for (std::size_t i = 0; i < n; ++i) {
                const Point& a = pts_[i];
                const Point& b = pts_[(i + 1) % n];
                sum += std::hypot(b.x - a.x, b.y - a.y);
            }
        }
        ++count_;
        cache_ = sum;
        return sum;
    }
    int computations() const { return count_; }
};
`,
    explanation: `**Logical constness.** \`perimeter()\` is a const method because asking for the perimeter does not change the polygon as the caller sees it. The cache and the counter are *implementation details*, so they are \`mutable\`; that lets the const method fill them without \`const_cast\`.

**Invalidation.** \`addPoint()\` is non-const and resets the optional, so the next call recomputes. The counter proves the work happens once per change. Every accessor is const, so they all work through a \`const Polygon&\`, which is how you should pass objects you only read.

In Python the same idea is \`functools.cached_property\`, except invalidation means deleting the cached attribute.`,
  },
  {
    id: 'cpp-toolbox-e02', lang: 'cpp', title: 'Explicit unit types', difficulty: 2,
    task: `Create two strongly typed units so a plain \`double\` can never be mistaken for one.

- \`struct Meters\` and \`struct Feet\`. Each has a \`constexpr explicit\` constructor taking a \`double\` and a \`constexpr explicit operator double() const\` returning the stored value.
- \`constexpr Feet toFeet(Meters m)\` converts using \`1 m = 3.28084 ft\`.
- Everything is \`constexpr\`, so \`constexpr Feet f = toFeet(Meters(100));\` compiles.

~~~cpp
constexpr Feet f = toFeet(Meters(100));
double v = static_cast<double>(f);   // 328.084
// Meters m = 5.0;                   // must NOT compile
~~~`,
    starter: `struct Meters {
    double v;
    constexpr Meters(double d) : v(d) {}
    constexpr operator double() const { return v; }
};

struct Feet {
    double v;
    constexpr Feet(double d) : v(d) {}
    constexpr operator double() const { return v; }
};

constexpr Feet toFeet(Meters m) { return Feet(0); }
`,
    tests: [
      { name: 'constructors are explicit', code: `EXPECT((!std::is_convertible_v<double, Meters>));
EXPECT((!std::is_convertible_v<double, Feet>));
EXPECT((std::is_constructible_v<Meters, double>));` },
      { name: 'conversion to double is explicit', code: `EXPECT((!std::is_convertible_v<Meters, double>));
EXPECT((std::is_constructible_v<double, Meters>));
EXPECT_NEAR(static_cast<double>(Meters(2.5)), 2.5, 1e-12);` },
      { name: 'toFeet at compile time', code: `constexpr Feet f = toFeet(Meters(100));
constexpr double d = static_cast<double>(f);
EXPECT_NEAR(d, 328.084, 1e-9);` },
      { name: 'toFeet at run time', code: `volatile double m = 1.0;
EXPECT_NEAR(static_cast<double>(toFeet(Meters(m))), 3.28084, 1e-9);` },
    ],
    hints: [
      'Put `explicit` in front of both the constructor and `operator double()`.',
      'Add `constexpr` to the constructor, the conversion operator and `toFeet`; the body of `toFeet` is `return Feet(static_cast<double>(m) * 3.28084);`.',
    ],
    solution: `struct Meters {
    double v;
    constexpr explicit Meters(double d) : v(d) {}
    constexpr explicit operator double() const { return v; }
};

struct Feet {
    double v;
    constexpr explicit Feet(double d) : v(d) {}
    constexpr explicit operator double() const { return v; }
};

constexpr Feet toFeet(Meters m) { return Feet(static_cast<double>(m) * 3.28084); }
`,
    explanation: `**Explicit in both directions.** The \`explicit\` constructor stops \`Meters m = 5.0;\` and stops a bare \`double\` from being passed where \`Meters\` is expected, which prevents unit mix-ups like passing feet to a function that wants meters. The \`explicit operator double()\` stops a unit from decaying into a number in arithmetic; the caller must write \`static_cast<double>\`, making the conversion visible.

**\`constexpr\` everywhere.** Because the constructor, conversion and \`toFeet\` are all \`constexpr\`, the conversion can happen at compile time, yet still works with runtime values.

This is the "strong type" idiom: a cheap wrapper that makes the type system carry the unit.`,
  },
  {
    id: 'cpp-toolbox-e03', lang: 'python', title: 'An immutable-view Matrix', difficulty: 2,
    task: `Write a \`Matrix\` class that exposes its data safely.

- \`Matrix(rows)\` takes a list of lists of numbers and stores a private copy.
- \`shape\` is a **read-only property** returning \`(row_count, column_count)\` (\`(0, 0)\` for an empty matrix).
- \`rows\` is a property returning a tuple of tuples, so callers cannot mutate the matrix through it.
- \`__bool__\` is true when the matrix has at least one row.
- \`determinant\` is a \`functools.cached_property\` for a 2x2 matrix (\`a*d - b*c\`); for any other shape it raises \`ValueError\`.

~~~python
m = Matrix([[1, 2], [3, 4]])
m.shape        # (2, 2)
m.determinant  # -2
bool(Matrix([]))  # False
~~~`,
    starter: `from functools import cached_property


class Matrix:
    def __init__(self, rows):
        raise NotImplementedError

    @property
    def shape(self):
        raise NotImplementedError

    @property
    def rows(self):
        raise NotImplementedError

    def __bool__(self):
        raise NotImplementedError

    @cached_property
    def determinant(self):
        raise NotImplementedError
`,
    tests: [
      { name: 'shape is read-only', code: `m = Matrix([[1, 2], [3, 4]])
assert m.shape == (2, 2), "shape should be (2, 2)"
try:
    m.shape = (1, 1)
    assert False, "shape must not be assignable"
except AttributeError:
    pass
assert Matrix([]).shape == (0, 0)` },
      { name: 'rows are immutable tuples', code: `m = Matrix([[1, 2], [3, 4]])
assert m.rows == ((1, 2), (3, 4))
assert isinstance(m.rows, tuple) and isinstance(m.rows[0], tuple)
src = [[1, 2], [3, 4]]
m2 = Matrix(src)
src[0][0] = 99
assert m2.rows[0][0] == 1, "Matrix must store a copy"` },
      { name: 'bool means non-empty', code: `assert bool(Matrix([[1]])) is True
assert bool(Matrix([])) is False` },
      { name: 'determinant is cached', code: `m = Matrix([[1, 2], [3, 4]])
assert "determinant" not in m.__dict__
assert m.determinant == -2
assert "determinant" in m.__dict__, "use functools.cached_property"
try:
    Matrix([[1, 2, 3]]).determinant
    assert False, "non-2x2 should raise ValueError"
except ValueError:
    pass` },
    ],
    hints: [
      'In __init__, store self._rows = [list(r) for r in rows] so you own a copy.',
      'rows returns tuple(tuple(r) for r in self._rows); shape is (len(self._rows), len(self._rows[0]) if self._rows else 0); __bool__ returns bool(self._rows).',
    ],
    solution: `from functools import cached_property


class Matrix:
    def __init__(self, rows):
        self._rows = [list(r) for r in rows]

    @property
    def shape(self):
        cols = len(self._rows[0]) if self._rows else 0
        return (len(self._rows), cols)

    @property
    def rows(self):
        return tuple(tuple(r) for r in self._rows)

    def __bool__(self):
        return bool(self._rows)

    @cached_property
    def determinant(self):
        if self.shape != (2, 2):
            raise ValueError("determinant is only implemented for 2x2")
        (a, b), (c, d) = self._rows
        return a * d - b * c
`,
    explanation: `**Read-only by design.** A \`property\` without a setter is Python's \`const\` getter: \`m.shape = ...\` raises \`AttributeError\`. Returning \`tuple\`s means the caller gets an immutable snapshot, so there is no way to reach in and change the matrix, much like returning \`const T&\` in C++.

**Defensive copy.** Copying the input in \`__init__\` stops the caller's list from aliasing internal state.

**Protocols and caching.** \`__bool__\` customizes truthiness (the analogue of \`explicit operator bool\`). \`cached_property\` computes the determinant once and stores it in the instance \`__dict__\`, like a \`mutable\` cache; it is safe here because the matrix cannot change.`,
  },
  {
    id: 'cpp-toolbox-e04', lang: 'python', title: 'Settings with a read-only view', difficulty: 2,
    task: `Write a \`Settings\` class that lets callers read configuration but change it only through a validated method.

- \`Settings(defaults)\` takes a dict and keeps a private copy; its keys are the only allowed keys.
- \`view\` is a property returning a \`types.MappingProxyType\` over the internal dict (live and read-only). Writing through it raises \`TypeError\`.
- \`update(**changes)\` raises \`KeyError\` if **any** key is unknown, and in that case changes nothing. Otherwise it applies all changes.

~~~python
s = Settings({"debug": False, "level": 1})
s.update(level=3)
s.view["level"]       # 3
s.view["debug"] = True  # TypeError
~~~`,
    starter: `from types import MappingProxyType


class Settings:
    def __init__(self, defaults):
        raise NotImplementedError

    @property
    def view(self):
        raise NotImplementedError

    def update(self, **changes):
        raise NotImplementedError
`,
    tests: [
      { name: 'view reads values', code: `s = Settings({"debug": False, "level": 1})
assert s.view["level"] == 1
assert isinstance(s.view, MappingProxyType), "view should be a MappingProxyType"` },
      { name: 'view is read-only', code: `s = Settings({"debug": False})
try:
    s.view["debug"] = True
    assert False, "writing through the view must fail"
except TypeError:
    pass
assert s.view["debug"] is False` },
      { name: 'update applies changes and the view is live', code: `s = Settings({"debug": False, "level": 1})
v = s.view
s.update(level=3, debug=True)
assert v["level"] == 3 and v["debug"] is True` },
      { name: 'unknown key rejects everything', code: `s = Settings({"debug": False, "level": 1})
try:
    s.update(level=9, color="red")
    assert False, "unknown key must raise KeyError"
except KeyError:
    pass
assert s.view["level"] == 1, "no partial update"
d = {"x": 1}
t = Settings(d)
d["x"] = 2
assert t.view["x"] == 1, "defaults must be copied"` },
    ],
    hints: [
      'Store self._data = dict(defaults) and return MappingProxyType(self._data) from view.',
      'In update, first compute unknown = [k for k in changes if k not in self._data]; raise KeyError if any, then call self._data.update(changes).',
    ],
    solution: `from types import MappingProxyType


class Settings:
    def __init__(self, defaults):
        self._data = dict(defaults)

    @property
    def view(self):
        return MappingProxyType(self._data)

    def update(self, **changes):
        unknown = [k for k in changes if k not in self._data]
        if unknown:
            raise KeyError(f"unknown settings: {unknown}")
        self._data.update(changes)
`,
    explanation: `**Expose a view, not the container.** Returning \`self._data\` directly would let any caller bypass validation. \`MappingProxyType\` gives a live, read-only window: readers see updates, but writes raise \`TypeError\`. This is the Python counterpart of a C++ getter returning \`const std::map<...>&\`.

**One gate for changes.** All mutation goes through \`update()\`, which validates first and applies second, so a bad call leaves the object unchanged (all-or-nothing). Keeping invariants in one method is the heart of encapsulation.`,
  },
];
