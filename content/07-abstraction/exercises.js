export default [
  {
    id: 'abstraction-e01', lang: 'cpp', title: 'Abstract shapes and a factory', difficulty: 1,
    task: `Turn \`Shape\` into a real abstract class and add two concrete shapes plus a factory.

- \`class Shape\`
  - a public **virtual destructor**: \`virtual ~Shape() = default;\`
  - three **pure virtual** functions: \`double area() const\`, \`double perimeter() const\`, \`std::string name() const\`.
- \`class Circle : public Shape\` with \`explicit Circle(double radius)\`: area πr², perimeter 2πr, name \`"circle"\`. Use \`std::numbers::pi\` from \`<numbers>\`.
- \`class Square : public Shape\` with \`explicit Square(double side)\`: area side², perimeter 4 × side, name \`"square"\`.
- \`std::unique_ptr<Shape> makeShape(const std::string& kind, double size)\` returns a \`Circle\` (radius \`size\`) for \`"circle"\`, a \`Square\` (side \`size\`) for \`"square"\`, and \`nullptr\` for any other kind.

The tests check that \`Shape\` is abstract (\`std::is_abstract_v<Shape>\`) while \`Circle\` and \`Square\` are not.

~~~cpp
auto s = makeShape("square", 3);
s->area();                 // 9
s->name();                 // "square"
makeShape("hexagon", 1);   // nullptr
// Shape plain;            // must not compile: Shape is abstract
~~~`,
    starter: `#include <memory>
#include <numbers>
#include <string>

class Shape {
public:
    virtual ~Shape() = default;

    // TODO: these fake defaults hide mistakes. Make all three pure virtual (= 0).
    virtual double area() const { return 0; }
    virtual double perimeter() const { return 0; }
    virtual std::string name() const { return ""; }
};

class Circle : public Shape {
public:
    explicit Circle(double radius) {}  // TODO: store the radius
    // TODO: override area(), perimeter() and name()
};

class Square : public Shape {
public:
    explicit Square(double side) {}  // TODO: store the side
    // TODO: override area(), perimeter() and name()
};

std::unique_ptr<Shape> makeShape(const std::string& kind, double size) {
    return nullptr;  // TODO: "circle" -> Circle, "square" -> Square, otherwise nullptr
}
`,
    tests: [
      { name: 'Shape is abstract, Circle and Square are concrete', code: `EXPECT(std::is_abstract_v<Shape>);
EXPECT(!std::is_abstract_v<Circle>);
EXPECT(!std::is_abstract_v<Square>);
EXPECT((std::is_base_of_v<Shape, Circle>));
EXPECT((std::is_base_of_v<Shape, Square>));` },
      { name: 'Shape has a virtual destructor', code: `EXPECT(std::has_virtual_destructor_v<Shape>);` },
      { name: 'Circle measurements', code: `const double pi = std::acos(-1.0);
Circle c(2.0);
EXPECT_NEAR(c.area(), pi * 4.0, 1e-9);
EXPECT_NEAR(c.perimeter(), pi * 4.0, 1e-9);
EXPECT_EQ(c.name(), std::string("circle"));
EXPECT_NEAR(Circle(0.5).area(), pi * 0.25, 1e-9);` },
      { name: 'Square measurements', code: `Square s(3.0);
EXPECT_NEAR(s.area(), 9.0, 1e-9);
EXPECT_NEAR(s.perimeter(), 12.0, 1e-9);
EXPECT_EQ(s.name(), std::string("square"));` },
      { name: 'calls through a Shape reference reach the overrides', code: `Square sq(2.0);
Circle ci(1.0);
const Shape& a = sq;
const Shape& b = ci;
EXPECT_NEAR(a.area(), 4.0, 1e-9);
EXPECT_EQ(a.name(), std::string("square"));
EXPECT_NEAR(b.perimeter(), 2.0 * std::acos(-1.0), 1e-9);
EXPECT_EQ(b.name(), std::string("circle"));` },
      { name: 'makeShape builds the right kind', code: `EXPECT((std::is_same_v<decltype(makeShape(std::string("circle"), 1.0)), std::unique_ptr<Shape>>));
auto c = makeShape("circle", 1.0);
EXPECT(c != nullptr);
EXPECT(dynamic_cast<Circle*>(c.get()) != nullptr);
EXPECT_NEAR(c->area(), std::acos(-1.0), 1e-9);
auto s = makeShape("square", 2.5);
EXPECT(s != nullptr);
EXPECT(dynamic_cast<Square*>(s.get()) != nullptr);
EXPECT_NEAR(s->perimeter(), 10.0, 1e-9);` },
      { name: 'makeShape returns nullptr for unknown kinds', code: `EXPECT(makeShape("triangle", 1.0) == nullptr);
EXPECT(makeShape("", 1.0) == nullptr);` },
    ],
    hints: [
      'A pure virtual function has no body in the class and ends in `= 0`, e.g. `virtual double area() const = 0;`. Once `Shape` has one, `std::is_abstract_v<Shape>` becomes true.',
      'Each concrete class stores its size in a private member set by the constructor (`explicit Circle(double radius) : radius_(radius) {}`) and overrides all three functions, marked `override`. Missing even one leaves the class abstract.',
      '`makeShape` compares the string and returns a smart pointer to the concrete class, which converts to `std::unique_ptr<Shape>`: `if (kind == "circle") return std::make_unique<Circle>(size);` ... and finally `return nullptr;`.',
    ],
    solution: `#include <memory>
#include <numbers>
#include <string>

class Shape {
public:
    virtual ~Shape() = default;
    virtual double area() const = 0;
    virtual double perimeter() const = 0;
    virtual std::string name() const = 0;
};

class Circle : public Shape {
public:
    explicit Circle(double radius) : radius_(radius) {}
    double area() const override { return std::numbers::pi * radius_ * radius_; }
    double perimeter() const override { return 2 * std::numbers::pi * radius_; }
    std::string name() const override { return "circle"; }

private:
    double radius_;
};

class Square : public Shape {
public:
    explicit Square(double side) : side_(side) {}
    double area() const override { return side_ * side_; }
    double perimeter() const override { return 4 * side_; }
    std::string name() const override { return "square"; }

private:
    double side_;
};

std::unique_ptr<Shape> makeShape(const std::string& kind, double size) {
    if (kind == "circle") return std::make_unique<Circle>(size);
    if (kind == "square") return std::make_unique<Square>(size);
    return nullptr;
}
`,
    explanation: `**Abstract instead of fake defaults.** With \`= 0\`, \`Shape\` states *what* every shape can do and refuses to exist on its own: \`Shape s;\` no longer compiles, and a subclass that forgets \`perimeter()\` stays abstract, so the mistake shows up as a compile error where the object is created instead of as a silent \`0\` at run time.

**Concrete classes supply the *how*.** \`Circle\` and \`Square\` each keep their own private data and override all three functions (\`override\` makes the compiler check every signature). The virtual destructor lets a \`std::unique_ptr<Shape>\` destroy whichever concrete shape it owns.

**The factory hides the concrete types.** Callers of \`makeShape\` only ever see \`std::unique_ptr<Shape>\`, so they depend on the abstraction, not on \`Circle\` or \`Square\`. Returning \`nullptr\` for an unknown kind keeps the interface honest; throwing \`std::invalid_argument\` would be the other common choice. Module 19 develops this idea into the Factory Method pattern.`,
  },
  {
    id: 'abstraction-e02', lang: 'cpp', title: 'Inject a Logger', difficulty: 2,
    task: `Build a small \`Logger\` interface, two implementations, and a service that depends **only on the interface**.

- \`class Logger\`: an interface with no data members:
  - \`virtual ~Logger() = default;\`
  - \`virtual void log(const std::string& msg) = 0;\`
- \`class MemoryLogger : public Logger\` remembers every message. \`lines()\` returns them in the order they were logged (for example as \`const std::vector<std::string>&\`).
- \`class ConsoleLogger : public Logger\` prints \`[log] <msg>\` followed by a newline to \`std::cout\`.
- \`class OrderService\`
  - \`explicit OrderService(Logger& log)\` keeps a **reference** to the injected logger (it must work with *any* \`Logger\`, including ones written later).
  - \`bool placeOrder(const std::string& item, int qty)\`: if \`qty > 0\`, logs \`placed <qty> x <item>\` and returns \`true\`; otherwise logs \`rejected <item>\` and returns \`false\`.
  - \`OrderService\` never prints anything itself: every message goes through the logger.

~~~cpp
MemoryLogger mem;
OrderService svc(mem);
svc.placeOrder("book", 2);   // true,  mem.lines() == {"placed 2 x book"}
svc.placeOrder("pen", 0);    // false, mem.lines() == {"placed 2 x book", "rejected pen"}

ConsoleLogger con;
OrderService(con).placeOrder("mug", 3);   // prints: [log] placed 3 x mug
~~~`,
    starter: `#include <iostream>
#include <string>
#include <vector>

class Logger {
public:
    virtual ~Logger() = default;
    // TODO: make log a pure virtual function
    virtual void log(const std::string& msg) {}
};

class MemoryLogger : public Logger {
public:
    void log(const std::string& msg) override {
        // TODO: remember msg
    }

    const std::vector<std::string>& lines() const { return lines_; }

private:
    std::vector<std::string> lines_;
};

class ConsoleLogger : public Logger {
public:
    void log(const std::string& msg) override {
        // TODO: print "[log] <msg>" and a newline
    }
};

class OrderService {
public:
    // TODO: keep a reference to the injected logger (do not copy it)
    explicit OrderService(Logger& log) {}

    bool placeOrder(const std::string& item, int qty) {
        return false;  // TODO: log "placed <qty> x <item>" or "rejected <item>"
    }
};
`,
    tests: [
      { name: 'Logger is an interface', code: `EXPECT(std::is_abstract_v<Logger>);
EXPECT(std::has_virtual_destructor_v<Logger>);
EXPECT((std::is_base_of_v<Logger, MemoryLogger>));
EXPECT((std::is_base_of_v<Logger, ConsoleLogger>));
EXPECT(!std::is_abstract_v<MemoryLogger>);
EXPECT(!std::is_abstract_v<ConsoleLogger>);` },
      { name: 'MemoryLogger records lines in order', code: `MemoryLogger m;
EXPECT(m.lines().empty());
m.log("first");
m.log("second");
EXPECT_EQ(m.lines().size(), 2u);
EXPECT_EQ(m.lines()[0], std::string("first"));
EXPECT_EQ(m.lines()[1], std::string("second"));` },
      { name: 'ConsoleLogger prints with a [log] prefix', code: `ConsoleLogger c;
std::string out = captureCout([&] { c.log("hello"); c.log("bye"); });
EXPECT_EQ(out, std::string("[log] hello\\n[log] bye\\n"));` },
      { name: 'placeOrder logs a placed order', code: `MemoryLogger m;
OrderService svc(m);
bool ok = false;
std::string out = captureCout([&] { ok = svc.placeOrder("book", 2); });
EXPECT(ok);
EXPECT_EQ(m.lines().size(), 1u);
EXPECT_EQ(m.lines()[0], std::string("placed 2 x book"));
EXPECT_EQ(out, std::string(""));` },
      { name: 'placeOrder rejects non-positive quantities', code: `MemoryLogger m;
OrderService svc(m);
EXPECT(!svc.placeOrder("pen", 0));
EXPECT(!svc.placeOrder("ink", -3));
EXPECT(svc.placeOrder("cup", 1));
EXPECT_EQ(m.lines().size(), 3u);
EXPECT_EQ(m.lines()[0], std::string("rejected pen"));
EXPECT_EQ(m.lines()[1], std::string("rejected ink"));
EXPECT_EQ(m.lines()[2], std::string("placed 1 x cup"));` },
      { name: 'OrderService accepts any Logger', code: `struct CountingLogger : Logger {
    int calls = 0;
    std::string last;
    void log(const std::string& msg) override { ++calls; last = msg; }
};
EXPECT((std::is_constructible_v<OrderService, Logger&>));
CountingLogger counter;
OrderService svc(counter);
svc.placeOrder("tea", 4);
svc.placeOrder("jam", 0);
EXPECT_EQ(counter.calls, 2);
EXPECT_EQ(counter.last, std::string("rejected jam"));` },
      { name: 'OrderService with a ConsoleLogger', code: `ConsoleLogger con;
OrderService svc(con);
std::string out = captureCout([&] { svc.placeOrder("mug", 3); svc.placeOrder("cap", -1); });
EXPECT_EQ(out, std::string("[log] placed 3 x mug\\n[log] rejected cap\\n"));` },
    ],
    hints: [
      'Write `virtual void log(const std::string& msg) = 0;` in `Logger`. Each implementation then overrides it: `MemoryLogger` pushes onto its vector, `ConsoleLogger` writes `"[log] " << msg << \'\\n\'` to `std::cout`.',
      '`OrderService` needs a member `Logger& log_;` initialized in the member-initializer list: `explicit OrderService(Logger& log) : log_(log) {}`. A reference (or pointer) is required: you cannot store an abstract `Logger` by value, and copying would cut the connection to the caller\'s logger.',
      'In `placeOrder`, handle the bad case first: log the rejection and `return false` early. The success message is then built from pieces joined with `+`; `std::to_string(qty)` turns the number into a `std::string` you can join.',
    ],
    solution: `#include <iostream>
#include <string>
#include <vector>

class Logger {
public:
    virtual ~Logger() = default;
    virtual void log(const std::string& msg) = 0;
};

class MemoryLogger : public Logger {
public:
    void log(const std::string& msg) override { lines_.push_back(msg); }

    const std::vector<std::string>& lines() const { return lines_; }

private:
    std::vector<std::string> lines_;
};

class ConsoleLogger : public Logger {
public:
    void log(const std::string& msg) override { std::cout << "[log] " << msg << '\\n'; }
};

class OrderService {
public:
    explicit OrderService(Logger& log) : log_(log) {}

    bool placeOrder(const std::string& item, int qty) {
        if (qty <= 0) {
            log_.log("rejected " + item);
            return false;
        }
        log_.log("placed " + std::to_string(qty) + " x " + item);
        return true;
    }

private:
    Logger& log_;  // the role, not a concrete class
};
`,
    explanation: `**An interface names a role.** \`Logger\` has one pure virtual function and a virtual destructor, nothing else. It says *what* a logger does; \`MemoryLogger\` and \`ConsoleLogger\` decide *how*.

**Depend on the abstraction, receive the implementation.** \`OrderService\` stores a \`Logger&\` handed to it in the constructor (dependency injection). It never mentions \`ConsoleLogger\`, so the same compiled code logs to the console in production, into a vector in tests, or into a \`CountingLogger\` someone writes next year. A reference is the natural choice: an abstract class cannot be held by value, and the service does not own the logger. The caller must keep the logger alive at least as long as the service.

**Why this makes testing easy.** A test creates a \`MemoryLogger\`, injects it, and asserts on \`lines()\`: no capturing \`std::cout\`, no parsing. Module 18 calls this **dependency inversion**, and keeping \`Logger\` this small is **interface segregation**.`,
  },
  {
    id: 'abstraction-e03', lang: 'python', title: 'Payment methods with an ABC', difficulty: 2,
    task: `Model payment methods with an abstract base class.

- \`PaymentMethod(ABC)\` declares two abstract members:
  - an abstract **read-only property** \`name\` (a \`str\`);
  - an abstract method \`pay(self, amount) -> str\`.
- \`CreditCard(PaymentMethod)\` takes \`last4\` (a string such as \`"4242"\`) and stores it as \`self.last4\`.
  - \`name\` is \`"card ending 4242"\`.
  - \`pay(12.5)\` returns \`"Charged 12.50 to card ending 4242"\`.
- \`PayPal(PaymentMethod)\` takes \`email\` and stores it as \`self.email\`.
  - \`name\` is \`"PayPal (ada@example.com)"\`.
  - \`pay(3)\` returns \`"Sent 3.00 via PayPal (ada@example.com)"\`.
- \`checkout(method, amount)\` returns \`method.pay(amount)\`. If \`amount <= 0\` it raises \`ValueError\` **without** calling \`pay\`.

Amounts are formatted with two decimals (\`f"{amount:.2f}"\`). The tests also check that \`PaymentMethod()\` and an incomplete subclass (missing \`name\` or \`pay\`) cannot be instantiated.

~~~python
card = CreditCard("4242")
card.name                      # 'card ending 4242'
checkout(card, 12.5)           # 'Charged 12.50 to card ending 4242'
checkout(PayPal("a@b.c"), 0)   # raises ValueError
PaymentMethod()                # raises TypeError
~~~`,
    starter: `from abc import ABC, abstractmethod


class PaymentMethod(ABC):
    # TODO: declare an abstract read-only property \`name\`
    # TODO: declare an abstract method \`pay(self, amount) -> str\`
    pass


class CreditCard(PaymentMethod):
    def __init__(self, last4):
        raise NotImplementedError

    @property
    def name(self):
        raise NotImplementedError

    def pay(self, amount):
        raise NotImplementedError


class PayPal(PaymentMethod):
    def __init__(self, email):
        raise NotImplementedError

    @property
    def name(self):
        raise NotImplementedError

    def pay(self, amount):
        raise NotImplementedError


def checkout(method, amount):
    raise NotImplementedError
`,
    tests: [
      { name: 'PaymentMethod is abstract', code: `assert PaymentMethod.__abstractmethods__ == {"name", "pay"}, f"abstract members are {set(PaymentMethod.__abstractmethods__)}, expected name and pay"
try:
    PaymentMethod()
except TypeError:
    pass
else:
    raise AssertionError("PaymentMethod() should raise TypeError")` },
      { name: 'name is an abstract property', code: `attr = vars(PaymentMethod).get("name")
assert isinstance(attr, property), "PaymentMethod.name should be a property"
assert getattr(attr, "__isabstractmethod__", False), "PaymentMethod.name should be abstract"` },
      { name: 'incomplete subclasses cannot be instantiated', code: `class NoName(PaymentMethod):
    def pay(self, amount):
        return "paid"


class NoPay(PaymentMethod):
    @property
    def name(self):
        return "nopay"


for cls in (NoName, NoPay):
    try:
        cls()
    except TypeError:
        pass
    else:
        raise AssertionError(f"{cls.__name__}() should raise TypeError")` },
      { name: 'CreditCard', code: `card = CreditCard("4242")
assert isinstance(card, PaymentMethod), "CreditCard must inherit from PaymentMethod"
assert card.last4 == "4242"
assert card.name == "card ending 4242", f"got {card.name!r}"
assert card.pay(12.5) == "Charged 12.50 to card ending 4242", f"got {card.pay(12.5)!r}"` },
      { name: 'PayPal', code: `pp = PayPal("ada@example.com")
assert isinstance(pp, PaymentMethod), "PayPal must inherit from PaymentMethod"
assert pp.email == "ada@example.com"
assert pp.name == "PayPal (ada@example.com)", f"got {pp.name!r}"
assert pp.pay(3) == "Sent 3.00 via PayPal (ada@example.com)", f"got {pp.pay(3)!r}"` },
      { name: 'checkout delegates to any PaymentMethod', code: `assert checkout(CreditCard("1111"), 20) == "Charged 20.00 to card ending 1111"


class Voucher(PaymentMethod):
    @property
    def name(self):
        return "voucher"

    def pay(self, amount):
        return f"voucher covers {amount}"


assert checkout(Voucher(), 5) == "voucher covers 5", "checkout should return method.pay(amount)"` },
      { name: 'checkout rejects non-positive amounts', code: `calls = []


class Spy(PaymentMethod):
    @property
    def name(self):
        return "spy"

    def pay(self, amount):
        calls.append(amount)
        return "ok"


for bad in (0, -5, -0.01):
    try:
        checkout(Spy(), bad)
    except ValueError:
        pass
    else:
        raise AssertionError(f"checkout(method, {bad}) should raise ValueError")
assert calls == [], "pay() must not be called for an invalid amount"
assert checkout(Spy(), 0.5) == "ok"` },
    ],
    hints: [
      'Abstract members are marked with `@abstractmethod`, and the class must inherit `ABC` for the check to happen. Their bodies can be just `...`.',
      'For the abstract property, stack the decorators with `@abstractmethod` innermost: `@property` on the first line, `@abstractmethod` on the next, then `def name(self) -> str: ...`. Each subclass then defines its own `@property def name(self)`.',
      '`CreditCard.pay` can reuse its own property: `return f"Charged {amount:.2f} to {self.name}"`. `checkout` validates first: `if amount <= 0: raise ValueError(...)`, then `return method.pay(amount)`.',
    ],
    solution: `from abc import ABC, abstractmethod


class PaymentMethod(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        """A human-readable description, e.g. 'card ending 4242'."""

    @abstractmethod
    def pay(self, amount: float) -> str:
        """Charge amount and return a receipt line."""


class CreditCard(PaymentMethod):
    def __init__(self, last4: str):
        self.last4 = last4

    @property
    def name(self) -> str:
        return f"card ending {self.last4}"

    def pay(self, amount: float) -> str:
        return f"Charged {amount:.2f} to {self.name}"


class PayPal(PaymentMethod):
    def __init__(self, email: str):
        self.email = email

    @property
    def name(self) -> str:
        return f"PayPal ({self.email})"

    def pay(self, amount: float) -> str:
        return f"Sent {amount:.2f} via {self.name}"


def checkout(method: PaymentMethod, amount: float) -> str:
    if amount <= 0:
        raise ValueError(f"amount must be positive, got {amount}")
    return method.pay(amount)
`,
    explanation: `**The ABC is the contract.** \`PaymentMethod\` lists what every payment method must provide, \`name\` and \`pay\`, and contains no payment logic. Because it inherits \`ABC\`, \`ABCMeta\` records both names in \`__abstractmethods__\`, so \`PaymentMethod()\` and any subclass that forgets one of them raise \`TypeError\` at **instantiation**, long before a customer reaches checkout.

**Abstract properties.** \`@property\` stacked over \`@abstractmethod\` makes \`name\` an abstract read-only attribute. Each subclass supplies its own property; \`pay\` reuses it, so the description is written once per class.

**Code against the abstraction.** \`checkout\` knows nothing about cards or PayPal: it validates the amount (before touching the payment method, so nothing is charged on bad input) and delegates to \`method.pay\`. A brand-new \`Voucher\` works without editing \`checkout\`: open for extension, closed for modification (Module 18).

In C++ the same contract is an abstract class with \`virtual std::string name() const = 0;\` and \`virtual std::string pay(double amount) = 0;\`.`,
  },
  {
    id: 'abstraction-e04', lang: 'python', title: 'Drawable protocol', difficulty: 2,
    task: `Use **structural typing**: anything with a \`draw()\` method counts as drawable, with no common base class.

- \`Drawable\`: a \`typing.Protocol\` declaring \`draw(self) -> str\`, decorated with \`@runtime_checkable\` so that \`isinstance(x, Drawable)\` works.
- \`Circle(radius)\` stores \`self.radius\`; \`draw()\` returns \`"circle r=<radius>"\`, e.g. \`"circle r=2"\`.
- \`Label(text)\` stores \`self.text\`; \`draw()\` returns \`"label: <text>"\`, e.g. \`"label: hi"\`.
- \`Circle\` and \`Label\` must **not** inherit from \`Drawable\` (the tests check that \`Drawable\` is not in \`Circle.__mro__\`).
- \`draw_all(items)\` takes a list and returns the drawings joined with newlines (\`""\` for an empty list). It first checks **every** item with \`isinstance(item, Drawable)\`; if any item is not drawable it raises \`TypeError\` and draws nothing.

~~~python
draw_all([Circle(2), Label("hi")])   # 'circle r=2\\nlabel: hi'

class Star:                          # unrelated class, no base
    def draw(self):
        return "*"

draw_all([Star(), Circle(1)])        # '*\\ncircle r=1'
draw_all([Circle(1), 42])            # raises TypeError
~~~`,
    starter: `from typing import Protocol, runtime_checkable


class Drawable(Protocol):
    # TODO: declare draw(self) -> str and make the protocol work with isinstance()
    pass


class Circle:
    def __init__(self, radius):
        raise NotImplementedError

    def draw(self):
        raise NotImplementedError


class Label:
    def __init__(self, text):
        raise NotImplementedError

    def draw(self):
        raise NotImplementedError


def draw_all(items):
    raise NotImplementedError
`,
    tests: [
      { name: 'Drawable is a runtime-checkable protocol', code: `from typing import Protocol
assert issubclass(Drawable, Protocol), "Drawable should be a typing.Protocol"
try:
    result = isinstance(Circle(1), Drawable)
except TypeError:
    raise AssertionError("isinstance(x, Drawable) raised TypeError: add @runtime_checkable")
assert result, "a Circle should count as Drawable"
assert not isinstance(42, Drawable), "an int is not Drawable"` },
      { name: 'Circle and Label do not inherit Drawable', code: `assert Drawable not in Circle.__mro__, "Circle must not inherit from Drawable"
assert Drawable not in Label.__mro__, "Label must not inherit from Drawable"
assert isinstance(Label("x"), Drawable), "a Label should count as Drawable"` },
      { name: 'draw output', code: `assert Circle(2).draw() == "circle r=2", f"got {Circle(2).draw()!r}"
assert Circle(2).radius == 2
assert Label("hi").draw() == "label: hi", f"got {Label('hi').draw()!r}"
assert Label("hi").text == "hi"` },
      { name: 'draw_all joins the drawings', code: `got = draw_all([Circle(1), Label("a"), Circle(3)])
assert got == "circle r=1\\nlabel: a\\ncircle r=3", f"got {got!r}"
assert draw_all([]) == "", "an empty list draws an empty string"` },
      { name: 'draw_all accepts unrelated classes with draw()', code: `class Star:
    def draw(self):
        return "*"


got = draw_all([Star(), Circle(1)])
assert got == "*\\ncircle r=1", f"got {got!r}"` },
      { name: 'draw_all raises TypeError for non-drawables', code: `class Box:
    def render(self):
        return "[]"


for bad in ([Circle(1), 42], [Box()], ["text"]):
    try:
        draw_all(bad)
    except TypeError:
        pass
    else:
        raise AssertionError(f"draw_all({bad!r}) should raise TypeError")` },
      { name: 'nothing is drawn when an item is invalid', code: `drawn = []


class Spy:
    def draw(self):
        drawn.append(1)
        return "spy"


try:
    draw_all([Spy(), None])
except TypeError:
    pass
else:
    raise AssertionError("draw_all should raise TypeError")
assert drawn == [], "check every item before calling draw() on any of them"` },
    ],
    hints: [
      'A protocol lists the members it needs, with `...` as the body: `def draw(self) -> str: ...`. Put `@runtime_checkable` on the line above `class Drawable(Protocol):`.',
      '`Circle` and `Label` are plain classes (`class Circle:`) that just happen to have a `draw` method. That is all structural typing needs.',
      'In `draw_all`, loop once to validate (`if not isinstance(item, Drawable): raise TypeError(...)`), then build the result: `return "\\n".join(item.draw() for item in items)`.',
    ],
    solution: `from typing import Protocol, runtime_checkable


@runtime_checkable
class Drawable(Protocol):
    def draw(self) -> str: ...


class Circle:
    def __init__(self, radius):
        self.radius = radius

    def draw(self) -> str:
        return f"circle r={self.radius}"


class Label:
    def __init__(self, text):
        self.text = text

    def draw(self) -> str:
        return f"label: {self.text}"


def draw_all(items) -> str:
    items = list(items)
    for item in items:
        if not isinstance(item, Drawable):
            raise TypeError(f"{type(item).__name__} is not Drawable: it has no draw() method")
    return "\\n".join(item.draw() for item in items)
`,
    explanation: `**Structural, not nominal.** \`Circle\`, \`Label\` and the test's \`Star\` never mention \`Drawable\`, yet all three qualify because they *have* a \`draw()\` method. A static type checker accepts them wherever a \`Drawable\` is annotated, and \`Drawable\` never appears in their MRO. This is how you describe an interface for classes you do not own or do not want to couple to a base class.

**\`@runtime_checkable\` and its limits.** The decorator lets \`isinstance(item, Drawable)\` work at run time, but it only checks that an attribute named \`draw\` exists, not its signature or return type. That is enough for a friendly early \`TypeError\`; full conformance is the type checker's job.

**Validate, then act.** \`draw_all\` checks every item before drawing any, so a bad item cannot leave half the work done. The C++ counterpart of this structural interface is a C++20 concept, \`requires(const T& t) { { t.draw() } -> std::convertible_to<std::string>; }\` (Module 15).`,
  },
];
