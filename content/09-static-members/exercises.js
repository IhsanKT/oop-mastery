export default [
  {
    id: 'static-members-e01', lang: 'cpp', title: 'Users with unique ids and a live count', difficulty: 2,
    task: `Write \`class User\` that gives every object a unique id and tracks how many users are alive.

- \`User()\` gets a fresh id from a static counter (each new id is larger than every earlier one).
- \`User(const User&)\` is a **copy constructor** that also receives a fresh id (a copy is a new user).
- \`~User()\` removes the user from the live count.
- \`int id() const\` returns the id; \`static int count()\` returns the number of **live** users.

~~~cpp
int before = User::count();
{
    User a;
    User b = a;                       // copy
    // User::count() == before + 2, a.id() != b.id()
}
// User::count() == before
~~~`,
    starter: `#include <memory>

class User {
public:
    User() {}
    User(const User& other) {}
    ~User() {}

    int id() const { return 0; }
    static int count() { return 0; }
};
`,
    tests: [
      { name: 'count goes up and down', code: `int before = User::count();
{
    User a;
    EXPECT_EQ(User::count(), before + 1);
    User b;
    EXPECT_EQ(User::count(), before + 2);
}
EXPECT_EQ(User::count(), before);` },
      { name: 'ids are unique and increasing', code: `User a;
User b;
User c;
EXPECT(a.id() < b.id());
EXPECT(b.id() < c.id());` },
      { name: 'copies are counted and get new ids', code: `int before = User::count();
{
    User a;
    User b = a;
    EXPECT_EQ(User::count(), before + 2);
    EXPECT(a.id() != b.id());
}
EXPECT_EQ(User::count(), before);` },
      { name: 'count() works without an object and is static', code: `EXPECT((std::is_same_v<decltype(&User::count), int (*)()>));
int before = User::count();
std::unique_ptr<User> p(new User);
EXPECT_EQ(User::count(), before + 1);
p.reset();
EXPECT_EQ(User::count(), before);` },
    ],
    hints: [
      'Use two private \`static inline int\` members, one for the next id and one for the live count.',
      'Every constructor (default and copy) must do \`id_ = ++nextId; ++live;\`; the destructor does \`--live\`.',
      '\`static int count() { return live; }\` has no \`this\`, so it can only use static members.',
    ],
    solution: `#include <memory>

class User {
    int id_;
    static inline int nextId = 0;
    static inline int live = 0;
public:
    User() : id_(++nextId) { ++live; }
    User(const User&) : id_(++nextId) { ++live; }   // a copy is a new user
    ~User() { --live; }

    int id() const { return id_; }
    static int count() { return live; }
};
`,
    explanation: `**Shared state in static members.** \`nextId\` and \`live\` exist once for the whole class, so every object sees the same counters. \`static inline\` (C++17) defines them in the class, with no separate definition in a source file. \`count()\` is a static function: it has no \`this\`, so it can be called as \`User::count()\` with no object.

**Count in every constructor.** The copy constructor is the classic trap: if it were left to the compiler, copies would be destroyed (decrementing) without ever having been counted (incrementing), and \`count()\` would go negative. Here it explicitly takes a fresh id and increments.

The destructor decrements, so \`live\` always equals the number of objects currently alive: the class tracks its own instances, which is the RAII habit of keeping bookkeeping tied to object lifetime.`,
  },
  {
    id: 'static-members-e02', lang: 'cpp', title: 'Temperature with named constructors', difficulty: 3,
    task: `Write \`class Temperature\` using the **named constructor** idiom.

- The constructor is **private**, so \`Temperature(21.0)\` does not compile (tests check \`!std::is_constructible_v<Temperature, double>\`).
- \`static constexpr double AbsoluteZeroC = -273.15;\`
- \`static Temperature fromCelsius(double)\`, \`fromFahrenheit(double)\`, \`fromKelvin(double)\`. Each throws \`std::out_of_range\` if the temperature is below absolute zero (a value equal to it is allowed).
- Getters \`double celsius() const\`, \`double fahrenheit() const\`, \`double kelvin() const\`. Fahrenheit = C * 9/5 + 32, Kelvin = C + 273.15. Store Celsius internally.

~~~cpp
auto boil = Temperature::fromCelsius(100);
boil.fahrenheit();                 // 212
Temperature::fromKelvin(-1);       // throws std::out_of_range
~~~`,
    starter: `#include <stdexcept>

class Temperature {
    double c_;
    explicit Temperature(double c) : c_(c) {}
public:
    static constexpr double AbsoluteZeroC = -273.15;
    static Temperature fromCelsius(double c) { return Temperature(0); }
    static Temperature fromFahrenheit(double f) { return Temperature(0); }
    static Temperature fromKelvin(double k) { return Temperature(0); }
    double celsius() const { return c_; }
    double fahrenheit() const { return 0; }
    double kelvin() const { return 0; }
};
`,
    tests: [
      { name: 'construction only through the factories', code: `EXPECT((!std::is_constructible_v<Temperature, double>));
EXPECT((!std::is_default_constructible_v<Temperature>));
EXPECT_NEAR(Temperature::AbsoluteZeroC, -273.15, 1e-12);` },
      { name: 'celsius factory and conversions', code: `auto t = Temperature::fromCelsius(100.0);
EXPECT_NEAR(t.celsius(), 100.0, 1e-9);
EXPECT_NEAR(t.fahrenheit(), 212.0, 1e-9);
EXPECT_NEAR(t.kelvin(), 373.15, 1e-9);` },
      { name: 'fahrenheit and kelvin factories', code: `EXPECT_NEAR(Temperature::fromFahrenheit(32.0).celsius(), 0.0, 1e-9);
EXPECT_NEAR(Temperature::fromFahrenheit(212.0).celsius(), 100.0, 1e-9);
EXPECT_NEAR(Temperature::fromKelvin(273.15).celsius(), 0.0, 1e-9);
EXPECT_NEAR(Temperature::fromKelvin(0.0).celsius(), -273.15, 1e-9);` },
      { name: 'below absolute zero throws', code: `EXPECT_THROWS(Temperature::fromCelsius(-300.0), std::out_of_range);
EXPECT_THROWS(Temperature::fromFahrenheit(-500.0), std::out_of_range);
EXPECT_THROWS(Temperature::fromKelvin(-1.0), std::out_of_range);
EXPECT_NEAR(Temperature::fromCelsius(-273.15).kelvin(), 0.0, 1e-9);` },
    ],
    hints: [
      'Keep \`explicit Temperature(double c)\` in the private section and give every factory a \`static\` declaration.',
      'Each factory converts its input to Celsius first, checks \`c < AbsoluteZeroC\`, throws \`std::out_of_range\`, then calls the private constructor.',
      'Fahrenheit to Celsius: \`(f - 32) * 5 / 9\`. Kelvin to Celsius: \`k - 273.15\`. A static function may call the private constructor because it is a member.',
    ],
    solution: `#include <stdexcept>

class Temperature {
    double c_;
    explicit Temperature(double c) : c_(c) {}
    static Temperature checked(double c) {
        if (c < AbsoluteZeroC) throw std::out_of_range("below absolute zero");
        return Temperature(c);
    }
public:
    static constexpr double AbsoluteZeroC = -273.15;

    static Temperature fromCelsius(double c) { return checked(c); }
    static Temperature fromFahrenheit(double f) { return checked((f - 32.0) * 5.0 / 9.0); }
    static Temperature fromKelvin(double k) { return checked(k - 273.15); }

    double celsius() const { return c_; }
    double fahrenheit() const { return c_ * 9.0 / 5.0 + 32.0; }
    double kelvin() const { return c_ + 273.15; }
};
`,
    explanation: `**Named constructors.** A bare \`Temperature(21.0)\` is ambiguous: Celsius? Kelvin? By making the constructor private and exposing \`fromCelsius\`, \`fromFahrenheit\` and \`fromKelvin\`, the call site says what the number means, and the class can **validate** before an object exists, so an invalid \`Temperature\` can never be created. This is encapsulation of invariants.

**Why static.** The factories are called before any object exists, so they are static member functions with no \`this\`. Being members, they may use the private constructor and the private helper \`checked\`. \`static constexpr double AbsoluteZeroC\` is a single compile-time constant shared by the class, implicitly inline in C++17.

Storing one canonical unit (Celsius) means each getter is a one-line conversion.`,
  },
  {
    id: 'static-members-e03', lang: 'python', title: 'Pizza alternate constructors', difficulty: 2,
    task: `Write \`class Pizza\` with class-level data and alternate constructors.

- Class attribute \`ALLOWED = {"tomato", "mozzarella", "ham", "cheese", "mushroom", "pineapple", "basil"}\`.
- \`Pizza(toppings)\` stores \`self.toppings = list(toppings)\`.
- \`@classmethod margherita(cls)\` returns \`cls(["tomato", "mozzarella"])\`.
- \`@classmethod from_string(cls, text)\` splits \`"ham, cheese"\` on commas, strips spaces and builds \`cls(...)\`. Raise \`ValueError\` if any topping is not valid.
- \`@staticmethod is_valid_topping(t)\` returns whether \`t\` is in \`Pizza.ALLOWED\`.
- \`class GlutenFreePizza(Pizza)\` needs no body: \`GlutenFreePizza.margherita()\` must return a \`GlutenFreePizza\`.

~~~python
p = GlutenFreePizza.from_string("ham, cheese")
type(p).__name__     # 'GlutenFreePizza'
p.toppings           # ['ham', 'cheese']
~~~`,
    starter: `class Pizza:
    ALLOWED = set()

    def __init__(self, toppings):
        raise NotImplementedError

    @classmethod
    def margherita(cls):
        raise NotImplementedError

    @classmethod
    def from_string(cls, text):
        raise NotImplementedError

    @staticmethod
    def is_valid_topping(t):
        raise NotImplementedError


class GlutenFreePizza(Pizza):
    pass
`,
    tests: [
      { name: 'margherita', code: `p = Pizza.margherita()
assert type(p) is Pizza
assert p.toppings == ["tomato", "mozzarella"]` },
      { name: 'from_string parses and strips', code: `p = Pizza.from_string("ham, cheese")
assert p.toppings == ["ham", "cheese"], p.toppings
assert Pizza.from_string("basil").toppings == ["basil"]` },
      { name: 'invalid toppings raise ValueError', code: `try:
    Pizza.from_string("ham,gravel")
    assert False, "expected ValueError"
except ValueError:
    pass` },
      { name: 'staticmethod validity check', code: `assert Pizza.is_valid_topping("ham") is True
assert Pizza.is_valid_topping("gravel") is False
assert Pizza("x").is_valid_topping("basil") is True
assert "tomato" in Pizza.ALLOWED` },
      { name: 'subclasses get their own type', code: `assert type(GlutenFreePizza.margherita()) is GlutenFreePizza
assert type(GlutenFreePizza.from_string("ham")) is GlutenFreePizza
assert isinstance(GlutenFreePizza.margherita(), Pizza)` },
    ],
    hints: [
      'Use \`return cls(...)\` in both classmethods, never \`Pizza(...)\`.',
      '\`from_string\` can be \`items = [s.strip() for s in text.split(",")]\`; validate with \`cls.is_valid_topping(t)\`.',
      '\`is_valid_topping\` is \`return t in Pizza.ALLOWED\`; copy the set from the task into \`ALLOWED\`.',
    ],
    solution: `class Pizza:
    ALLOWED = {"tomato", "mozzarella", "ham", "cheese", "mushroom", "pineapple", "basil"}

    def __init__(self, toppings):
        self.toppings = list(toppings)

    @classmethod
    def margherita(cls):
        return cls(["tomato", "mozzarella"])

    @classmethod
    def from_string(cls, text):
        items = [s.strip() for s in text.split(",")]
        for t in items:
            if not cls.is_valid_topping(t):
                raise ValueError(f"unknown topping: {t!r}")
        return cls(items)

    @staticmethod
    def is_valid_topping(t):
        return t in Pizza.ALLOWED


class GlutenFreePizza(Pizza):
    pass
`,
    explanation: `**Alternate constructors with \`cls\`.** \`margherita\` and \`from_string\` are classmethods: they receive the class they were called on and build it with \`cls(...)\`. That is why \`GlutenFreePizza.margherita()\` returns a \`GlutenFreePizza\` without any subclass code. Writing \`Pizza(...)\` instead would silently return the base type.

**Static helper.** \`is_valid_topping\` needs neither an instance nor a class to construct, so it is a \`@staticmethod\`: a plain function namespaced under \`Pizza\`. The allowed toppings live once in the class attribute \`ALLOWED\`, shared by all pizzas.

In C++ the same design is a static factory function, but it cannot adapt to a subclass automatically, which is one place where Python's \`cls\` is more flexible.`,
  },
  {
    id: 'static-members-e04', lang: 'python', title: 'Config with class-level defaults', difficulty: 3,
    task: `Write \`class Config\` whose defaults live on the **class**.

- Class attributes \`host = "localhost"\`, \`port = 8080\`, \`debug = False\`, and \`KEYS = ("host", "port", "debug")\`.
- \`Config()\` takes no arguments and stores nothing per instance, so an unset value is read from the class.
- \`@classmethod from_dict(cls, d)\` creates \`cls()\` and sets an instance attribute for each key of \`d\` that is in \`KEYS\`; unknown keys are ignored.
- \`@staticmethod parse_bool(text)\` returns \`True\` for \`"yes"\`, \`"true"\`, \`"1"\`, \`"on"\` and \`False\` for \`"no"\`, \`"false"\`, \`"0"\`, \`"off"\` (case-insensitive, whitespace ignored); anything else raises \`ValueError\`.
- Setting an attribute on one instance must **not** change the class or other instances.

~~~python
c = Config.from_dict({"port": 9000, "colour": "red"})
c.port, c.host        # (9000, 'localhost')
Config.port           # 8080: the class default is untouched
~~~`,
    starter: `class Config:
    host = "localhost"
    port = 8080
    debug = False
    KEYS = ("host", "port", "debug")

    @classmethod
    def from_dict(cls, d):
        raise NotImplementedError

    @staticmethod
    def parse_bool(text):
        raise NotImplementedError
`,
    tests: [
      { name: 'defaults come from the class', code: `c = Config()
assert c.host == "localhost" and c.port == 8080 and c.debug is False
assert "port" not in vars(c), "defaults must not be copied into the instance"` },
      { name: 'from_dict sets known keys and ignores unknown ones', code: `c = Config.from_dict({"port": 9000, "colour": "red"})
assert c.port == 9000
assert c.host == "localhost"
assert not hasattr(c, "colour")
assert vars(c) == {"port": 9000}, vars(c)` },
      { name: 'overriding one instance does not touch the class', code: `a, b = Config(), Config()
a.port = 1
assert Config.port == 8080
assert b.port == 8080
assert a.port == 1` },
      { name: 'parse_bool', code: `assert Config.parse_bool("yes") is True
assert Config.parse_bool(" TRUE ") is True
assert Config.parse_bool("on") is True and Config.parse_bool("1") is True
assert Config.parse_bool("No") is False
assert Config.parse_bool("off") is False and Config.parse_bool("0") is False
try:
    Config.parse_bool("maybe")
    assert False, "expected ValueError"
except ValueError:
    pass` },
      { name: 'from_dict respects subclasses', code: `class Dev(Config):
    debug = True

d = Dev.from_dict({"host": "dev.local"})
assert type(d) is Dev
assert d.debug is True and d.host == "dev.local"` },
    ],
    hints: [
      '\`from_dict\` starts with \`obj = cls()\` so subclasses work, then loops over \`d.items()\`.',
      'Use \`if key in cls.KEYS: setattr(obj, key, value)\`; setting through the instance creates an instance attribute and leaves the class alone.',
      'For \`parse_bool\` normalise with \`text.strip().lower()\`, then test membership in two small sets and raise \`ValueError\` otherwise.',
    ],
    solution: `class Config:
    host = "localhost"
    port = 8080
    debug = False
    KEYS = ("host", "port", "debug")

    @classmethod
    def from_dict(cls, d):
        obj = cls()
        for key, value in d.items():
            if key in cls.KEYS:
                setattr(obj, key, value)
        return obj

    @staticmethod
    def parse_bool(text):
        t = text.strip().lower()
        if t in {"yes", "true", "1", "on"}:
            return True
        if t in {"no", "false", "0", "off"}:
            return False
        raise ValueError(f"not a boolean: {text!r}")
`,
    explanation: `**Class attributes as defaults.** \`host\`, \`port\` and \`debug\` are stored once on the class. An instance that has not assigned them reads the class value, since attribute lookup falls back from instance to class. Assigning through an instance (\`a.port = 1\` or \`setattr\`) creates an **instance** attribute that shadows the default for that object only, so the class and other instances are unaffected.

**\`from_dict\` as a classmethod.** It calls \`cls()\`, so \`Dev.from_dict(...)\` returns a \`Dev\` that also inherits the \`Dev\` defaults. **\`parse_bool\`** needs no state at all, so it is a \`@staticmethod\`: a pure helper grouped with the class that uses it.`,
  },
];
