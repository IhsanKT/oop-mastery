export default [
  {
    id: 'lifetime-e01', lang: 'cpp', title: 'A Range that is always valid', difficulty: 2,
    task: `Build a half-open integer range \`[lo, hi)\` whose constructors guarantee \`lo <= hi\`.

- \`Range(int lo, int hi)\`: if \`lo > hi\`, swap them, so \`Range(5, 2)\` is \`[2, 5)\`.
- \`Range()\` **delegates** to \`Range(0, 0)\` (an empty range).
- \`explicit Range(int hi)\` **delegates** to \`Range(0, hi)\`, so \`Range(4)\` is \`[0, 4)\` and \`Range(-3)\` is \`[-3, 0)\`. Because it is \`explicit\`, an \`int\` must **not** convert to a \`Range\` implicitly.
- \`int lo() const\` and \`int hi() const\` return the bounds.
- \`int length() const\` returns \`hi - lo\`.
- \`bool contains(int x) const\` returns \`true\` when \`lo <= x < hi\` (the upper bound is excluded).

~~~cpp
Range r(5, 2);     // swapped: [2, 5)
r.length();        // 3
r.contains(2);     // true
r.contains(5);     // false: hi is excluded
Range(-3).lo();    // -3
// Range bad = 7;  // must not compile
~~~`,
    starter: `#include <utility>

class Range {
public:
    Range(int lo, int hi) : lo_(0), hi_(0) {
        // TODO: store lo and hi, swapping them if lo > hi
    }

    Range() : lo_(0), hi_(0) {}  // TODO: delegate to Range(0, 0)

    // TODO: delegate to Range(0, hi), and stop an int from converting to Range implicitly
    Range(int hi) : lo_(0), hi_(0) {}

    int lo() const { return -1; }      // TODO
    int hi() const { return -1; }      // TODO
    int length() const { return -1; }  // TODO
    bool contains(int x) const { return false; }  // TODO

private:
    int lo_;
    int hi_;
};
`,
    tests: [
      { name: 'constructors exist and Range(int) is explicit', code: `EXPECT((std::is_default_constructible_v<Range>));
EXPECT((std::is_constructible_v<Range, int, int>));
EXPECT((std::is_constructible_v<Range, int>));
EXPECT((!std::is_convertible_v<int, Range>));` },
      { name: 'two-argument constructor keeps lo <= hi', code: `Range a(2, 5);
EXPECT_EQ(a.lo(), 2);
EXPECT_EQ(a.hi(), 5);
Range b(5, 2);
EXPECT_EQ(b.lo(), 2);
EXPECT_EQ(b.hi(), 5);` },
      { name: 'Range() is the empty range [0, 0)', code: `Range r;
EXPECT_EQ(r.lo(), 0);
EXPECT_EQ(r.hi(), 0);
EXPECT_EQ(r.length(), 0);
EXPECT(!r.contains(0));` },
      { name: 'Range(hi) starts at 0 and still keeps lo <= hi', code: `Range r(4);
EXPECT_EQ(r.lo(), 0);
EXPECT_EQ(r.hi(), 4);
Range neg(-3);
EXPECT_EQ(neg.lo(), -3);
EXPECT_EQ(neg.hi(), 0);` },
      { name: 'length', code: `EXPECT_EQ(Range(2, 5).length(), 3);
EXPECT_EQ(Range(5, 2).length(), 3);
EXPECT_EQ(Range(-3).length(), 3);
EXPECT_EQ(Range(7, 7).length(), 0);` },
      { name: 'contains is half-open and works on const objects', code: `const Range r(2, 5);
EXPECT(r.contains(2));
EXPECT(r.contains(4));
EXPECT(!r.contains(5));
EXPECT(!r.contains(1));
const Range neg(-3);
EXPECT(neg.contains(-3));
EXPECT(neg.contains(-1));
EXPECT(!neg.contains(0));` },
    ],
    hints: [
      'Put the swap in one place only: the two-argument constructor. Initialize `lo_` and `hi_` in its member-initializer list, then fix the order in the body.',
      'A delegating constructor names another constructor as its *only* initializer: `Range() : Range(0, 0) {}`. The one-argument version works the same way, with `explicit` in front: `explicit Range(int hi) : Range(0, hi) {}`.',
      'The two-argument body is one line: `if (lo_ > hi_) std::swap(lo_, hi_);` (from `<utility>`). Half-open means `return lo_ <= x && x < hi_;`, and the length is `hi_ - lo_`.',
    ],
    solution: `#include <utility>

class Range {
public:
    Range(int lo, int hi) : lo_(lo), hi_(hi) {
        if (lo_ > hi_) std::swap(lo_, hi_);
    }

    Range() : Range(0, 0) {}

    explicit Range(int hi) : Range(0, hi) {}

    int lo() const { return lo_; }
    int hi() const { return hi_; }
    int length() const { return hi_ - lo_; }
    bool contains(int x) const { return lo_ <= x && x < hi_; }

private:
    int lo_;
    int hi_;
};
`,
    explanation: `**One constructor owns the invariant.** Only \`Range(int, int)\` contains logic: it stores the bounds and swaps them if needed, so every \`Range\` satisfies \`lo <= hi\`. The other two constructors **delegate** to it (\`: Range(0, 0)\`, \`: Range(0, hi)\`), so they cannot forget the rule: \`Range(-3)\` becomes \`[-3, 0)\` for free. Because the invariant always holds, \`length()\` is never negative and \`contains()\` needs no special cases.

**\`explicit\` keeps the type meaningful.** Without it, \`Range r = 7;\` or passing \`7\` to a \`void f(Range)\` would compile and silently create \`[0, 7)\`. With it, a range from one number must be written out as \`Range(7)\`, and \`std::is_convertible_v<int, Range>\` is \`false\`.

This is **encapsulation through construction**: the members are private and only constructors set them, so no code path can produce an invalid range. Python has no constructor overloading; there you would write \`def __init__(self, lo=0, hi=None)\` or add \`@classmethod\` alternative constructors that call \`cls(...)\`.`,
  },
  {
    id: 'lifetime-e02', lang: 'cpp', title: 'ScopedLogger: RAII in miniature', difficulty: 2,
    task: `Write an RAII class that logs when a scope is entered and left.

- \`explicit ScopedLogger(std::string name)\` prints \`enter <name>\` followed by a newline.
- \`~ScopedLogger()\` prints \`exit <name>\` followed by a newline.
- Copying is forbidden: **delete** the copy constructor and the copy assignment operator (a copy would print a second \`exit\` for a single \`enter\`).

Print to \`std::cout\`, ending each line with \`'\\n'\`. Because the destructor does the logging, \`exit\` must appear however the scope ends: at its closing brace, through an early \`return\`, or because an exception is passing through.

~~~cpp
void work() {
    ScopedLogger log("work");   // prints "enter work"
    step();                     // even if step() throws...
}                               // ...this prints "exit work"
~~~`,
    starter: `#include <iostream>
#include <string>
#include <utility>

class ScopedLogger {
public:
    explicit ScopedLogger(std::string name) {
        // TODO: store the name and print "enter <name>" plus a newline
    }

    ~ScopedLogger() {
        // TODO: print "exit <name>" plus a newline
    }

    // TODO: delete the copy constructor and the copy assignment operator
};
`,
    tests: [
      { name: 'explicit and not copyable', code: `EXPECT((std::is_constructible_v<ScopedLogger, std::string>));
EXPECT((!std::is_convertible_v<std::string, ScopedLogger>));
EXPECT((!std::is_copy_constructible_v<ScopedLogger>));
EXPECT((!std::is_copy_assignable_v<ScopedLogger>));` },
      { name: 'enter and exit around one scope', code: `std::string out = captureCout([&] { ScopedLogger log("solo"); });
EXPECT_EQ(out, std::string("enter solo\\nexit solo\\n"));` },
      { name: 'nested scopes exit in reverse order', code: `std::string out = captureCout([&] {
    ScopedLogger outer("outer");
    {
        ScopedLogger inner("inner");
        std::cout << "work\\n";
    }
    ScopedLogger after("after");
});
EXPECT_EQ(out, std::string("enter outer\\nenter inner\\nwork\\nexit inner\\nenter after\\nexit after\\nexit outer\\n"));` },
      { name: 'exit is printed when an exception leaves the scope', code: `std::string out = captureCout([&] {
    try {
        ScopedLogger log("risky");
        throw std::runtime_error("boom");
    } catch (const std::runtime_error&) {
        std::cout << "caught\\n";
    }
});
EXPECT_EQ(out, std::string("enter risky\\nexit risky\\ncaught\\n"));` },
      { name: 'exit is printed on an early return', code: `auto run = [](bool early) {
    ScopedLogger log("f");
    if (early) return 1;
    std::cout << "late\\n";
    return 2;
};
int r = 0;
std::string out = captureCout([&] { r = run(true); });
EXPECT_EQ(r, 1);
EXPECT_EQ(out, std::string("enter f\\nexit f\\n"));
out = captureCout([&] { r = run(false); });
EXPECT_EQ(r, 2);
EXPECT_EQ(out, std::string("enter f\\nlate\\nexit f\\n"));` },
    ],
    hints: [
      'Keep the name in a private `std::string name_`, initialized in the member-initializer list. The constructor prints `"enter "` and the destructor prints `"exit "`, each followed by the name and `\'\\n\'`.',
      'You never call the destructor yourself: C++ calls it when the object goes out of scope, including during stack unwinding while an exception passes through. That is what makes the exception and early-return tests pass.',
      'Forbid copies with `ScopedLogger(const ScopedLogger&) = delete;` and `ScopedLogger& operator=(const ScopedLogger&) = delete;` in the public section.',
    ],
    solution: `#include <iostream>
#include <string>
#include <utility>

class ScopedLogger {
public:
    explicit ScopedLogger(std::string name) : name_(std::move(name)) {
        std::cout << "enter " << name_ << '\\n';
    }

    ~ScopedLogger() {
        std::cout << "exit " << name_ << '\\n';
    }

    ScopedLogger(const ScopedLogger&) = delete;
    ScopedLogger& operator=(const ScopedLogger&) = delete;

private:
    std::string name_;
};
`,
    explanation: `**RAII in its purest form.** The constructor does the "acquire" step (printing \`enter\`) and the destructor the "release" step (printing \`exit\`). Callers write nothing extra: whether the scope ends at its closing brace, through an early \`return\`, or because an exception is propagating, C++ destroys the local \`ScopedLogger\`, so every \`enter\` is matched by exactly one \`exit\`. Nested loggers exit in reverse order because locals are destroyed in reverse order of construction.

**Why copying is deleted.** A copy would be a second object with the same name, and *its* destructor would print a second \`exit\` for a single \`enter\`. Real RAII types such as \`std::lock_guard\` forbid copying for the same reason, and \`std::unique_ptr\` allows only moves; Module 10 covers the Rule of Three/Five. \`explicit\` stops a stray \`std::string\` from silently turning into a logger.

In Python the same idea is a context manager: \`__enter__\` prints \`enter\`, \`__exit__\` prints \`exit\`, and the caller writes \`with ScopedLogger("work"):\`.`,
  },
  {
    id: 'lifetime-e03', lang: 'python', title: 'Timer context manager', difficulty: 2,
    task: `Write a context manager that measures how long its \`with\` block takes.

- \`Timer(clock=time.perf_counter)\`: \`clock\` is any zero-argument function that returns a time in seconds. Store it and set \`self.elapsed = None\`. Do **not** call the clock yet.
- \`__enter__\` resets \`self.elapsed\` to \`None\`, records the start time by calling \`clock()\` once, and returns the timer itself (so \`with Timer() as t:\` works).
- \`__exit__(self, exc_type, exc, tb)\` calls \`clock()\` once more and sets \`self.elapsed\` to end minus start. It must **not** suppress exceptions: if the block raises, \`elapsed\` is still set and the exception continues to the caller.
- A timer can be reused; each block overwrites \`elapsed\`.

Taking the clock as a parameter makes the class testable: the tests pass a fake clock that returns scripted values.

~~~python
ticks = iter([10.0, 12.5])
with Timer(clock=lambda: next(ticks)) as t:
    print(t.elapsed)   # None: still running
print(t.elapsed)       # 2.5
~~~`,
    starter: `import time


class Timer:
    def __init__(self, clock=time.perf_counter):
        raise NotImplementedError

    def __enter__(self):
        raise NotImplementedError

    def __exit__(self, exc_type, exc, tb):
        raise NotImplementedError
`,
    tests: [
      { name: 'default clock is time.perf_counter', code: `import inspect, time
default = inspect.signature(Timer).parameters["clock"].default
assert default is time.perf_counter, f"the default clock should be time.perf_counter, got {default!r}"` },
      { name: 'with returns the timer and measures the block', code: `ticks = iter([10.0, 12.5])
t = Timer(clock=lambda: next(ticks))
assert t.elapsed is None, "elapsed should be None before any block has run"
with t as same:
    assert same is t, "__enter__ should return the timer itself"
    assert t.elapsed is None, "elapsed should stay None while the block runs"
assert t.elapsed == 2.5, f"expected 2.5, got {t.elapsed!r}"` },
      { name: 'clock is called once on entry and once on exit', code: `calls = []
def fake():
    calls.append(1)
    return float(len(calls))
t = Timer(clock=fake)
assert calls == [], "creating a Timer must not call clock() yet"
with t:
    assert len(calls) == 1, f"clock() should be called once by __enter__, got {len(calls)} calls"
assert len(calls) == 2, f"clock() should be called once more by __exit__, got {len(calls)} calls in total"
assert t.elapsed == 1.0, f"expected 1.0, got {t.elapsed!r}"` },
      { name: 'exceptions are not suppressed', code: `ticks = iter([1.0, 4.0])
t = Timer(clock=lambda: next(ticks))
try:
    with t:
        raise KeyError("boom")
except KeyError:
    pass
else:
    raise AssertionError("Timer must not suppress exceptions raised in the block")
assert t.elapsed == 3.0, f"elapsed should be set even when the block raises, got {t.elapsed!r}"` },
      { name: 'a timer can be reused', code: `ticks = iter([0.0, 1.0, 10.0, 13.0])
t = Timer(clock=lambda: next(ticks))
with t:
    pass
assert t.elapsed == 1.0, f"first block: expected 1.0, got {t.elapsed!r}"
with t:
    assert t.elapsed is None, "__enter__ should reset elapsed to None"
assert t.elapsed == 3.0, f"second block: expected 3.0, got {t.elapsed!r}"` },
      { name: 'works with the real clock', code: `with Timer() as t:
    sum(range(1000))
assert isinstance(t.elapsed, float) and t.elapsed >= 0, f"expected a non-negative float, got {t.elapsed!r}"` },
    ],
    hints: [
      '`__init__` only stores things: `self.clock = clock` and `self.elapsed = None`. Timing starts when the block is entered, not when the object is created.',
      '`__enter__` sets `self.elapsed = None`, saves `self._start = self.clock()`, and must `return self`, because `with Timer() as t` binds whatever `__enter__` returns.',
      '`__exit__` computes `self.elapsed = self.clock() - self._start` and returns `False` (or `None`). Returning `True` would swallow any exception raised in the block.',
    ],
    solution: `import time


class Timer:
    def __init__(self, clock=time.perf_counter):
        self.clock = clock
        self.elapsed = None
        self._start = None

    def __enter__(self):
        self.elapsed = None
        self._start = self.clock()
        return self

    def __exit__(self, exc_type, exc, tb):
        self.elapsed = self.clock() - self._start
        return False
`,
    explanation: `**Python's RAII.** A \`with\` block guarantees that \`__exit__\` runs when the block ends, normally or through an exception, just as C++ guarantees a destructor call at the end of a scope. Here \`__enter__\` is the "acquire" step (record the start time) and \`__exit__\` the "release" step (compute \`elapsed\`). Because \`__exit__\` returns \`False\`, an exception in the block still reaches the caller instead of being silently swallowed, yet the measurement is recorded.

**Why not \`__init__\` and \`__del__\`?** \`__init__\` runs when the object is created, which may be long before the block starts (and only once, even if the timer is reused), and \`__del__\` runs whenever the garbage collector gets to it, if ever. Only \`__enter__\` and \`__exit__\` mark the block's exact boundaries.

**Dependency injection.** Passing \`clock\` in, with \`time.perf_counter\` as the default, lets tests substitute a fake clock and check exact values without sleeping. The standard library's \`contextlib.contextmanager\` offers a generator-based shortcut for writing context managers like this one.`,
  },
  {
    id: 'lifetime-e04', lang: 'python', title: 'A Fraction that normalizes itself', difficulty: 2,
    task: `Write a \`Fraction\` whose \`__init__\` guarantees a normalized form, so every \`Fraction\` object is valid and has exactly one representation.

- \`Fraction(numerator, denominator=1)\` takes two \`int\`s and stores them as \`self.numerator\` and \`self.denominator\` **after normalizing**:
  - a zero denominator raises \`ValueError\`;
  - the sign is carried by the numerator: the stored denominator is always positive;
  - the fraction is reduced to lowest terms (use \`math.gcd\`), so zero is stored as \`0/1\`.
- \`__repr__\` returns, for example, \`Fraction(3, 4)\` (the normalized values).
- \`@classmethod from_string(cls, text)\` parses text such as \`"3/4"\` (two integers separated by \`/\`) and returns \`cls(3, 4)\`, so subclasses get instances of their own type. \`from_string("1/0")\` must raise \`ValueError\` as well.

~~~python
Fraction(6, -8)                # Fraction(-3, 4)
Fraction(0, 5)                 # Fraction(0, 1)
Fraction(7)                    # Fraction(7, 1)
Fraction.from_string("10/4")   # Fraction(5, 2)
Fraction(1, 0)                 # raises ValueError
~~~`,
    starter: `from math import gcd


class Fraction:
    def __init__(self, numerator, denominator=1):
        raise NotImplementedError

    def __repr__(self):
        raise NotImplementedError

    @classmethod
    def from_string(cls, text):
        raise NotImplementedError
`,
    tests: [
      { name: 'reduces to lowest terms', code: `f = Fraction(6, 8)
assert (f.numerator, f.denominator) == (3, 4), f"Fraction(6, 8): expected 3/4, got {f.numerator}/{f.denominator}"` },
      { name: 'sign is carried by the numerator', code: `for args, want in [((6, -8), (-3, 4)), ((-6, -8), (3, 4)), ((-1, 2), (-1, 2))]:
    f = Fraction(*args)
    got = (f.numerator, f.denominator)
    assert got == want, f"Fraction{args}: expected {want}, got {got}"` },
      { name: 'zero and the default denominator', code: `z = Fraction(0, -5)
assert (z.numerator, z.denominator) == (0, 1), f"zero should be stored as 0/1, got {z.numerator}/{z.denominator}"
w = Fraction(7)
assert (w.numerator, w.denominator) == (7, 1), "the denominator should default to 1"` },
      { name: 'zero denominator raises ValueError', code: `try:
    Fraction(1, 0)
except ValueError:
    pass
else:
    raise AssertionError("Fraction(1, 0) should raise ValueError")` },
      { name: '__repr__ shows the normalized values', code: `r = repr(Fraction(3, 4))
assert r == "Fraction(3, 4)", f"got {r!r}"
r = repr(Fraction(10, -4))
assert r == "Fraction(-5, 2)", f"got {r!r}"` },
      { name: 'from_string is a classmethod that reuses __init__', code: `assert isinstance(vars(Fraction)["from_string"], classmethod), "from_string should be a @classmethod"
f = Fraction.from_string("10/4")
assert (f.numerator, f.denominator) == (5, 2), f"from_string('10/4'): got {f.numerator}/{f.denominator}"
g = Fraction.from_string("-3/-6")
assert (g.numerator, g.denominator) == (1, 2), "from_string should rely on __init__ for normalization"` },
      { name: 'from_string builds cls and validates', code: `class Exact(Fraction):
    pass

e = Exact.from_string("2/4")
assert type(e) is Exact, "from_string should call cls(...), not Fraction(...)"
try:
    Fraction.from_string("1/0")
except ValueError:
    pass
else:
    raise AssertionError('from_string("1/0") should raise ValueError')` },
    ],
    hints: [
      'Normalize in this order inside `__init__`: reject a zero denominator, flip both signs if the denominator is negative, then divide both by their gcd. Only then assign the attributes.',
      '`math.gcd` always returns a non-negative number, and `gcd(0, n) == n`, so `0/5` reduces to `0/1` with no special case. Use `//` so that the results stay `int`s.',
      '`from_string` can be two lines: `num, den = text.split("/")` and `return cls(int(num), int(den))`. Calling `cls(...)` runs `__init__`, so the validation and normalization are reused.',
    ],
    solution: `from math import gcd


class Fraction:
    def __init__(self, numerator, denominator=1):
        if denominator == 0:
            raise ValueError("denominator must not be zero")
        if denominator < 0:
            numerator, denominator = -numerator, -denominator
        g = gcd(numerator, denominator)
        self.numerator = numerator // g
        self.denominator = denominator // g

    def __repr__(self):
        return f"Fraction({self.numerator}, {self.denominator})"

    @classmethod
    def from_string(cls, text):
        num, den = text.split("/")
        return cls(int(num), int(den))
`,
    explanation: `**The initializer owns the invariant.** Every \`Fraction\` satisfies three rules: the denominator is positive, the fraction is in lowest terms, and nothing is divided by zero. They are enforced in exactly one place, \`__init__\`, before the attributes are even set, so no other method has to re-check them, and equal values always look the same: \`Fraction(2, 4)\` and \`Fraction(-1, -2)\` both store \`1/2\`. Invalid input raises \`ValueError\`, so a broken \`Fraction\` never exists.

**Alternative constructors delegate.** \`from_string\` only parses the text, then builds the object with \`cls(int(num), int(den))\`, which runs \`__init__\` and all its checks. This is Python's counterpart to a C++ delegating constructor. Using \`cls\` rather than hard-coding \`Fraction\` means \`Exact.from_string(...)\` returns an \`Exact\` (Module 09 explores \`@classmethod\` factories).

Note that \`Fraction(1, 2) == Fraction(2, 4)\` is still \`False\` here: without \`__eq__\`, \`==\` compares identity. Module 08 adds operators.`,
  },
];
