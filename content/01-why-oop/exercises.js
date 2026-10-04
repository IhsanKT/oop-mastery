export default [
  {
    id: 'why-oop-e01', lang: 'cpp', title: 'Your first class: Counter', difficulty: 1,
    task: `Write a click counter as a class.

- \`class Counter\`, created with no arguments. A new counter's value is \`0\`.
- \`void increment()\` adds 1 to the value.
- \`void reset()\` sets the value back to \`0\`.
- \`int value() const\` returns the current value. It is \`const\` because it only reads the state.

Keep the count in a **private** data member, so the only way to change it is through \`increment()\` and \`reset()\`. Every \`Counter\` object must have its own count.

~~~cpp
Counter clicks;
clicks.increment();
clicks.increment();
clicks.value();   // 2
Counter other;    // a separate object with its own state
other.value();    // 0
clicks.reset();
clicks.value();   // 0
~~~`,
    starter: `class Counter {
public:
    void increment() {
        // TODO: add 1
    }

    void reset() {
        // TODO: back to 0
    }

    int value() const {
        return -1;  // TODO: return the current count
    }

private:
    // TODO: a data member that holds the count, starting at 0
};
`,
    tests: [
      { name: 'a new counter starts at 0', code: `Counter c;
EXPECT_EQ(c.value(), 0);` },
      { name: 'increment adds one each time', code: `Counter c;
c.increment();
EXPECT_EQ(c.value(), 1);
c.increment();
c.increment();
EXPECT_EQ(c.value(), 3);` },
      { name: 'reset goes back to 0 and counting continues', code: `Counter c;
for (int i = 0; i < 5; ++i) c.increment();
c.reset();
EXPECT_EQ(c.value(), 0);
c.increment();
EXPECT_EQ(c.value(), 1);` },
      { name: 'each object has its own count', code: `Counter a, b;
a.increment();
a.increment();
b.increment();
EXPECT_EQ(a.value(), 2);
EXPECT_EQ(b.value(), 1);
Counter fresh;
EXPECT_EQ(fresh.value(), 0);` },
      { name: 'value() is const and returns int', code: `Counter c;
c.increment();
const Counter& view = c;
EXPECT_EQ(view.value(), 1);
EXPECT((std::is_same_v<decltype(view.value()), int>));` },
      { name: 'the count is a private data member (declare it under private:)', code: `// A class with private data members is never an aggregate; one with only
// public members (or no data at all) is, unless it declares a constructor.
EXPECT((!std::is_aggregate_v<Counter>));` },
    ],
    hints: [
      'Add a private data member for the count under `private:`, for example `int count_ = 0;`. The `= 0` (a default member initializer) makes every new `Counter` start at 0.',
      '`increment()` can be `++count_;` and `reset()` can be `count_ = 0;`. Both change the object, so they are *not* marked `const`.',
      '`int value() const { return count_; }`. Inside a member function, `count_` means *this* object\'s count (`this->count_`), which is why two counters never interfere.',
    ],
    solution: `class Counter {
public:
    void increment() { ++count_; }

    void reset() { count_ = 0; }

    int value() const { return count_; }

private:
    int count_ = 0;
};
`,
    explanation: `**State + behavior in one unit.** \`count_\` is the state; \`increment\`, \`reset\` and \`value\` are the behavior. Each \`Counter\` object owns its own \`count_\`, and a member function always works on the object it was called on (\`this\`), so \`a.increment()\` never touches \`b\`.

**Encapsulation.** Because \`count_\` is \`private\`, the only possible changes are "+1" and "back to 0". The invariant "the count is never negative" therefore holds automatically: no outside code can write \`c.count_ = -3\`.

**const-correctness.** \`value()\` is marked \`const\`, a promise that it does not modify the object. That promise is what allows calling it through a \`const Counter&\`, and the compiler enforces it: \`++count_\` inside \`value()\` would not compile.

The default member initializer \`int count_ = 0;\` means no constructor is needed: the compiler-generated default constructor starts every counter at 0.`,
  },
  {
    id: 'why-oop-e02', lang: 'cpp', title: 'Refactor: BankAccount', difficulty: 2,
    task: `This procedural code spreads each account over two parallel vectors, and any function can break the rules:

~~~cpp
std::vector<std::string> owners;
std::vector<double> balances;   // balances[i] belongs to owners[i]

bool deposit(std::size_t i, double amount)  { /* checks amount > 0 */ }
bool withdraw(std::size_t i, double amount) { /* checks amount > 0 and no overdraft */ }
~~~

Refactor it into \`class BankAccount\`:

- \`explicit BankAccount(std::string owner)\` stores the owner; the balance starts at \`0\`.
- \`std::string owner() const\` returns the owner.
- \`double balance() const\` returns the current balance.
- \`bool deposit(double amount)\`: if \`amount <= 0\`, return \`false\` and change nothing; otherwise add it and return \`true\`.
- \`bool withdraw(double amount)\`: if \`amount <= 0\` **or** \`amount\` is greater than the balance, return \`false\` and change nothing; otherwise subtract it and return \`true\`. Withdrawing the entire balance is allowed.
- \`bool transferTo(BankAccount& other, double amount)\`: move \`amount\` from this account into \`other\`, following the same rules. If the withdrawal would be rejected, return \`false\` and change **neither** account.

Keep the owner and balance in **private** data members, so no code outside the class can bypass the rules.

~~~cpp
BankAccount ada("Ada"), grace("Grace");
ada.deposit(100);           // true
ada.withdraw(-5);           // false: not a positive amount
ada.withdraw(150);          // false: overdraft
ada.transferTo(grace, 40);  // true: ada has 60, grace has 40
~~~`,
    starter: `#include <string>
#include <utility>

class BankAccount {
public:
    explicit BankAccount(std::string owner) {
        // TODO: store the owner; the balance starts at 0
    }

    std::string owner() const {
        return "";  // TODO
    }

    double balance() const {
        return -1;  // TODO
    }

    bool deposit(double amount) {
        return false;  // TODO: reject amount <= 0, otherwise add it
    }

    bool withdraw(double amount) {
        return false;  // TODO: reject amount <= 0 and overdrafts, otherwise subtract
    }

    bool transferTo(BankAccount& other, double amount) {
        return false;  // TODO: withdraw here, deposit there, all or nothing
    }

private:
    // TODO: data members for the owner and the balance
};
`,
    tests: [
      { name: 'a new account has its owner and a zero balance', code: `BankAccount acc("Ada");
EXPECT_EQ(acc.owner(), std::string("Ada"));
EXPECT_NEAR(acc.balance(), 0.0, 1e-9);` },
      { name: 'deposit adds positive amounts', code: `BankAccount acc("Ada");
EXPECT(acc.deposit(100));
EXPECT(acc.deposit(25.5));
EXPECT_NEAR(acc.balance(), 125.5, 1e-9);` },
      { name: 'deposit rejects zero and negative amounts', code: `BankAccount acc("Ada");
acc.deposit(50);
EXPECT(!acc.deposit(0));
EXPECT(!acc.deposit(-10));
EXPECT_NEAR(acc.balance(), 50.0, 1e-9);` },
      { name: 'withdraw within the balance', code: `BankAccount acc("Ada");
acc.deposit(100);
EXPECT(acc.withdraw(30));
EXPECT_NEAR(acc.balance(), 70.0, 1e-9);
EXPECT(acc.withdraw(70));
EXPECT_NEAR(acc.balance(), 0.0, 1e-9);` },
      { name: 'withdraw rejects overdrafts and non-positive amounts', code: `BankAccount acc("Ada");
acc.deposit(50);
EXPECT(!acc.withdraw(80));
EXPECT(!acc.withdraw(0));
EXPECT(!acc.withdraw(-10));
EXPECT_NEAR(acc.balance(), 50.0, 1e-9);` },
      { name: 'transferTo moves money between two objects', code: `BankAccount ada("Ada"), grace("Grace");
ada.deposit(100);
EXPECT(ada.transferTo(grace, 40));
EXPECT_NEAR(ada.balance(), 60.0, 1e-9);
EXPECT_NEAR(grace.balance(), 40.0, 1e-9);` },
      { name: 'a rejected transfer changes neither account', code: `BankAccount ada("Ada"), grace("Grace");
ada.deposit(30);
grace.deposit(10);
EXPECT(!ada.transferTo(grace, 50));
EXPECT(!ada.transferTo(grace, -5));
EXPECT(!ada.transferTo(grace, 0));
EXPECT_NEAR(ada.balance(), 30.0, 1e-9);
EXPECT_NEAR(grace.balance(), 10.0, 1e-9);` },
      { name: 'accounts are independent objects', code: `BankAccount a("A"), b("B");
a.deposit(10);
EXPECT_NEAR(a.balance(), 10.0, 1e-9);
EXPECT_NEAR(b.balance(), 0.0, 1e-9);
EXPECT_EQ(b.owner(), std::string("B"));` },
      { name: 'interface: const getters, bool results, explicit constructor', code: `BankAccount acc("Ada");
const BankAccount& view = acc;
EXPECT_NEAR(view.balance(), 0.0, 1e-9);
EXPECT_EQ(view.owner(), std::string("Ada"));
EXPECT((std::is_same_v<decltype(acc.deposit(1.0)), bool>));
EXPECT((std::is_same_v<decltype(acc.withdraw(1.0)), bool>));
EXPECT((std::is_same_v<decltype(acc.transferTo(acc, 1.0)), bool>));
EXPECT((!std::is_convertible_v<std::string, BankAccount>));` },
    ],
    hints: [
      'Two private data members replace the two parallel vectors: `std::string owner_;` and `double balance_ = 0.0;`. Set the owner in the member-initializer list: `explicit BankAccount(std::string owner) : owner_(std::move(owner)) {}`.',
      'Write each rule exactly once: `deposit` starts with `if (amount <= 0) return false;`, and `withdraw` with `if (amount <= 0 || amount > balance_) return false;`. Only after the check do you change `balance_`.',
      '`transferTo` should reuse the checked methods instead of touching balances directly: `if (!withdraw(amount)) return false; other.deposit(amount); return true;`. If `withdraw` succeeded, `amount` was positive, so the deposit cannot fail.',
    ],
    solution: `#include <string>
#include <utility>

class BankAccount {
public:
    explicit BankAccount(std::string owner) : owner_(std::move(owner)) {}

    std::string owner() const { return owner_; }

    double balance() const { return balance_; }

    bool deposit(double amount) {
        if (amount <= 0) return false;
        balance_ += amount;
        return true;
    }

    bool withdraw(double amount) {
        if (amount <= 0 || amount > balance_) return false;
        balance_ -= amount;
        return true;
    }

    bool transferTo(BankAccount& other, double amount) {
        if (!withdraw(amount)) return false;  // every check lives in withdraw
        other.deposit(amount);                // cannot fail: amount > 0 here
        return true;
    }

private:
    std::string owner_;
    double balance_ = 0.0;
};
`,
    explanation: `**From parallel arrays to one object.** \`owners[i]\` and \`balances[i]\` become \`owner_\` and \`balance_\` inside one \`BankAccount\`. They can no longer drift apart, and a \`std::vector<BankAccount>\` would need no index bookkeeping at all.

**Each invariant in exactly one place.** \`balance_\` is private, and only \`deposit\` and \`withdraw\` change it, each after checking its rule. No outside code can write \`acc.balance_ = -5\`, so "never negative" holds for every account, always.

**Objects collaborate through messages.** \`transferTo\` does not reach into \`other.balance_\`. C++ would actually allow that, because \`private\` is per *class*, not per object. Instead it asks this account to \`withdraw\` and the other to \`deposit\`, reusing the checks rather than duplicating them. Checking the withdrawal first makes the transfer all-or-nothing.

**Why \`BankAccount&\`?** With a by-value parameter, \`transferTo\` would deposit into a local *copy* of \`grace\`, and the money would vanish when the function returned: C++ value semantics from the lesson.`,
  },
  {
    id: 'why-oop-e03', lang: 'python', title: 'Your first class: Counter', difficulty: 1,
    task: `Write the Python version of the click counter.

- \`Counter()\` takes no arguments. A new counter's value is \`0\`.
- \`increment()\` adds 1 to the value.
- \`reset()\` sets the value back to \`0\`.
- \`value()\` returns the current value as an \`int\`.

Store the count on the instance (through \`self\`), in an attribute with a leading underscore such as \`self._count\`, to signal "use the methods". Every \`Counter\` object must have its own count.

~~~python
clicks = Counter()
clicks.increment()
clicks.increment()
clicks.value()    # 2
other = Counter() # a separate object with its own state
other.value()     # 0
clicks.reset()
clicks.value()    # 0
~~~`,
    starter: `class Counter:
    def __init__(self):
        raise NotImplementedError

    def increment(self):
        raise NotImplementedError

    def reset(self):
        raise NotImplementedError

    def value(self):
        raise NotImplementedError
`,
    tests: [
      { name: 'a new counter starts at 0', code: `c = Counter()
assert c.value() == 0, f"expected 0, got {c.value()!r}"` },
      { name: 'increment adds one each time', code: `c = Counter()
c.increment()
assert c.value() == 1, f"expected 1, got {c.value()!r}"
c.increment()
c.increment()
assert c.value() == 3, f"expected 3, got {c.value()!r}"` },
      { name: 'reset goes back to 0 and counting continues', code: `c = Counter()
for _ in range(5):
    c.increment()
c.reset()
assert c.value() == 0, "reset() should set the value back to 0"
c.increment()
assert c.value() == 1, "counting should continue after reset()"` },
      { name: 'each object has its own count', code: `a, b = Counter(), Counter()
a.increment()
a.increment()
b.increment()
assert (a.value(), b.value()) == (2, 1), f"got {(a.value(), b.value())!r}: counters must not share state"
assert Counter().value() == 0, "a new counter must start at 0"` },
      { name: 'Counter is a class with the three methods', code: `assert isinstance(Counter, type), "Counter must be a class"
for name in ("increment", "reset", "value"):
    assert callable(getattr(Counter, name, None)), f"Counter needs a {name}() method"
c = Counter()
c.increment()
v = c.value()
assert type(v) is int, f"value() should return an int, got {type(v).__name__}"` },
    ],
    hints: [
      'In `__init__(self)`, create the state on the new object: `self._count = 0`.',
      '`increment` does `self._count += 1` and `reset` does `self._count = 0`. Without `self.`, Python would treat `_count` as a local variable of the method.',
      '`value` simply returns `self._count`. Because every method works on `self`, two `Counter` objects never share a count.',
    ],
    solution: `class Counter:
    def __init__(self):
        self._count = 0

    def increment(self):
        self._count += 1

    def reset(self):
        self._count = 0

    def value(self):
        return self._count
`,
    explanation: `**\`self\` is the object.** \`clicks.increment()\` runs \`Counter.increment(clicks)\`, so inside the method \`self\` is \`clicks\` and \`self._count += 1\` changes *that* counter's state. This is Python's explicit version of C++'s hidden \`this\`.

**State lives on the instance.** \`__init__\` creates \`_count\` on each new object, so every \`Counter\` has its own count. Storing it in a module-level variable, or updating it through the class (\`Counter._count += 1\`), would make every counter share one count, which the independence test catches. (A class-level \`_count = 0\` with \`self._count += 1\` happens to work: the first \`+=\` creates an instance attribute that hides the class one. Module 02 explains this.)

**Encapsulation by convention.** The leading underscore says "internal: use \`increment()\` and \`reset()\`". Unlike C++'s \`private\`, nothing stops \`c._count = -3\`; Python trusts the caller. Module 04 shows \`@property\`, which lets a class control even direct attribute access.`,
  },
  {
    id: 'why-oop-e04', lang: 'python', title: 'Rectangle', difficulty: 2,
    task: `Write a \`Rectangle\` class whose methods compute answers from its state.

- \`Rectangle(width, height)\` stores the sides as the attributes \`width\` and \`height\`. If either side is not positive (\`<= 0\`), raise \`ValueError\`.
- \`area()\` returns \`width * height\`.
- \`perimeter()\` returns \`2 * (width + height)\`.
- \`is_square()\` returns \`True\` if width equals height, otherwise \`False\`.

The methods must compute their result from the **current** attributes each time they are called, not from values saved in \`__init__\`: if code later sets \`r.width = 10\`, \`r.area()\` must reflect it.

~~~python
r = Rectangle(3, 4)
r.area()          # 12
r.perimeter()     # 14
r.is_square()     # False
r.width = 4
r.is_square()     # True
Rectangle(0, 4)   # raises ValueError
~~~`,
    starter: `class Rectangle:
    def __init__(self, width, height):
        raise NotImplementedError

    def area(self):
        raise NotImplementedError

    def perimeter(self):
        raise NotImplementedError

    def is_square(self):
        raise NotImplementedError
`,
    tests: [
      { name: 'stores width and height', code: `r = Rectangle(3, 4)
assert (r.width, r.height) == (3, 4), f"got width={r.width!r}, height={r.height!r}"` },
      { name: 'area and perimeter', code: `r = Rectangle(3, 4)
assert r.area() == 12, f"expected 12, got {r.area()!r}"
assert r.perimeter() == 14, f"expected 14, got {r.perimeter()!r}"
f = Rectangle(2.5, 4)
assert abs(f.area() - 10.0) < 1e-9, f"expected 10.0, got {f.area()!r}"
assert abs(f.perimeter() - 13.0) < 1e-9, f"expected 13.0, got {f.perimeter()!r}"` },
      { name: 'is_square', code: `assert Rectangle(5, 5).is_square() is True, "5 x 5 is a square"
assert Rectangle(5, 6).is_square() is False, "5 x 6 is not a square"
assert Rectangle(2.5, 2.5).is_square() is True, "2.5 x 2.5 is a square"` },
      { name: 'rejects non-positive sides', code: `for args in [(0, 4), (4, 0), (-1, 2), (2, -3)]:
    try:
        Rectangle(*args)
    except ValueError:
        pass
    else:
        raise AssertionError(f"Rectangle{args} should raise ValueError")` },
      { name: 'methods use the current state', code: `r = Rectangle(3, 4)
r.width = 10
assert r.area() == 40, "area() must use the current width"
assert r.perimeter() == 28, "perimeter() must use the current width"
r.height = 10
assert r.is_square() is True, "is_square() must use the current sides"` },
      { name: 'each rectangle has its own state', code: `assert isinstance(Rectangle, type), "Rectangle must be a class"
a, b = Rectangle(1, 2), Rectangle(3, 4)
a.width = 7
assert (a.area(), b.area()) == (14, 12), f"got {(a.area(), b.area())!r}"` },
    ],
    hints: [
      'Validate first, then store: `if width <= 0 or height <= 0: raise ValueError("sides must be positive")`, followed by `self.width = width` and `self.height = height`.',
      'Each method reads the attributes through `self` when it is called, e.g. `return self.width * self.height`. Do not compute the area in `__init__` and store it: it would go stale as soon as a side changes.',
      '`is_square` can return the comparison itself: `return self.width == self.height` already evaluates to `True` or `False`.',
    ],
    solution: `class Rectangle:
    def __init__(self, width, height):
        if width <= 0 or height <= 0:
            raise ValueError("width and height must be positive")
        self.width = width
        self.height = height

    def area(self):
        return self.width * self.height

    def perimeter(self):
        return 2 * (self.width + self.height)

    def is_square(self):
        return self.width == self.height
`,
    explanation: `**Behavior derived from state.** A \`Rectangle\` stores only what defines it, \`width\` and \`height\`; \`area()\`, \`perimeter()\` and \`is_square()\` compute their answers from that state on every call. Nothing can go stale, which is why changing \`r.width\` is immediately reflected. Caching the area in \`__init__\` would create a second copy of the truth that silently disagrees with the first.

**The constructor establishes the invariant.** Rejecting non-positive sides in \`__init__\` guarantees that every \`Rectangle\` starts valid. It stops there, though: \`width\` is a plain public attribute, so \`r.width = -1\` later is not caught. Closing that gap is the job of encapsulation, with \`@property\` in Python or private members plus setters in C++ (Module 04).

In C++ the same class would keep \`width_\` and \`height_\` private and make \`area()\`, \`perimeter()\` and \`isSquare()\` \`const\` member functions, since they only read the state.`,
  },
];
