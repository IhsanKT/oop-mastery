export default [
  {
    id: 'python-object-model-e01', lang: 'python', title: 'A Typed descriptor', difficulty: 2,
    task: `Write a reusable validating descriptor.

- \`Typed(expected_type)\` is a descriptor class. \`__set_name__(self, owner, name)\` records the attribute name; the value is stored in the instance \`__dict__\` under \`"_" + name\`.
- \`__get__\` returns the stored value (and the descriptor itself when accessed on the class, i.e. \`obj is None\`).
- \`__set__\` raises \`TypeError\` unless \`isinstance(value, expected_type)\`; otherwise it stores the value.
- \`Product(name, price)\` declares \`name = Typed(str)\` and \`price = Typed(float)\` at class level and assigns both in \`__init__\`.

~~~python
p = Product("pen", 1.5)
p.price = 2.0       # ok
p.price = "free"    # TypeError
p._price            # 2.0
~~~`,
    starter: `class Typed:
    def __init__(self, expected_type):
        raise NotImplementedError

    def __set_name__(self, owner, name):
        raise NotImplementedError

    def __get__(self, obj, objtype=None):
        raise NotImplementedError

    def __set__(self, obj, value):
        raise NotImplementedError


class Product:
    def __init__(self, name, price):
        raise NotImplementedError
`,
    tests: [
      { name: 'stores and returns values', code: `p = Product("pen", 1.5)
assert p.name == "pen" and p.price == 1.5` },
      { name: 'rejects wrong types', code: `p = Product("pen", 1.5)
for attr, bad in (("price", "free"), ("name", 5)):
    try:
        setattr(p, attr, bad)
        assert False, attr + " should reject " + repr(bad)
    except TypeError:
        pass
assert p.price == 1.5, "failed assignment must not change the value"` },
      { name: 'constructor validates too', code: `try:
    Product("pen", "cheap")
    assert False, "constructor should raise TypeError"
except TypeError:
    pass` },
      { name: 'uses __set_name__ for storage', code: `p = Product("pen", 1.5)
assert p.__dict__.get("_price") == 1.5 and p.__dict__.get("_name") == "pen", "store under '_' + attribute name"
assert isinstance(Product.price, Typed), "class access should return the descriptor"` },
    ],
    hints: [
      'Store the type in __init__ and compute self.private = "_" + name inside __set_name__.',
      '__get__: if obj is None return self; else return obj.__dict__[self.private]. __set__: check isinstance, then obj.__dict__[self.private] = value. In Product, write name = Typed(str) and price = Typed(float) at class level.',
    ],
    solution: `class Typed:
    def __init__(self, expected_type):
        self.expected_type = expected_type
        self.private = None

    def __set_name__(self, owner, name):
        self.private = "_" + name

    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        return obj.__dict__[self.private]

    def __set__(self, obj, value):
        if not isinstance(value, self.expected_type):
            raise TypeError(
                f"expected {self.expected_type.__name__}, got {type(value).__name__}"
            )
        obj.__dict__[self.private] = value


class Product:
    name = Typed(str)
    price = Typed(float)

    def __init__(self, name, price):
        self.name = name
        self.price = price
`,
    explanation: `**One descriptor, many fields.** \`Typed\` defines \`__set__\`, so it is a *data descriptor*: it sits at the top of the attribute lookup order and intercepts every assignment, even from \`__init__\`. \`__set_name__\` is called once when \`Product\` is created and hands the descriptor its attribute name, so the same class validates both \`name\` and \`price\` without repeating strings.

**Why store in \`obj.__dict__\`?** The descriptor object is shared by all products (it lives on the class), so per-instance data must go on the instance. The \`"_" + name\` key avoids clashing with the descriptor itself.

This is how \`property\` works internally. In C++ the same guard is a wrapper type with a validating setter.`,
  },
  {
    id: 'python-object-model-e02', lang: 'python', title: 'A frozen, ordered Version', difficulty: 2,
    task: `Use a dataclass to model semantic versions.

- \`@dataclass(frozen=True, order=True) class Version\` with int fields \`major\`, \`minor\`, \`patch\` (in that order).
- \`__post_init__\` raises \`ValueError\` if any field is negative.
- \`Version.parse("1.2.3")\` is a \`@classmethod\` returning \`Version(1, 2, 3)\`. It raises \`ValueError\` unless the string has exactly three dot-separated non-negative integers.
- \`str(v)\` returns \`"1.2.3"\`.

~~~python
sorted([Version.parse("1.10.0"), Version.parse("1.2.9")])
# [Version(1, 2, 9), Version(1, 10, 0)]
~~~`,
    starter: `from dataclasses import dataclass


class Version:
    def __init__(self, major, minor, patch):
        raise NotImplementedError

    @classmethod
    def parse(cls, text):
        raise NotImplementedError
`,
    tests: [
      { name: 'is a frozen dataclass', code: `import dataclasses
assert dataclasses.is_dataclass(Version), "use @dataclass"
v = Version(1, 2, 3)
try:
    v.major = 9
    assert False, "should be frozen"
except dataclasses.FrozenInstanceError:
    pass` },
      { name: 'validation', code: `try:
    Version(1, -1, 0)
    assert False, "negative values must raise ValueError"
except ValueError:
    pass
assert Version(0, 0, 0).patch == 0` },
      { name: 'parse', code: `assert Version.parse("1.2.3") == Version(1, 2, 3)
for bad in ("1.2", "1.2.3.4", "a.b.c", "1.-2.3"):
    try:
        Version.parse(bad)
        assert False, "should reject " + bad
    except ValueError:
        pass` },
      { name: 'ordering and str', code: `vs = [Version.parse("1.10.0"), Version.parse("1.2.9"), Version.parse("0.9.9")]
assert [str(v) for v in sorted(vs)] == ["0.9.9", "1.2.9", "1.10.0"], "numeric, not textual, ordering"
assert Version(1, 0, 0) < Version(1, 0, 1)
assert Version(2, 0, 0) == Version(2, 0, 0)` },
    ],
    hints: [
      'Decorate the class with @dataclass(frozen=True, order=True) and declare major: int, minor: int, patch: int.',
      'Check negatives in __post_init__. In parse, split on ".", require len(parts) == 3, and build with cls(*map(int, parts)); a negative or non-numeric part will raise ValueError (the negative via __post_init__). Define __str__ with an f-string.',
    ],
    solution: `from dataclasses import dataclass


@dataclass(frozen=True, order=True)
class Version:
    major: int
    minor: int
    patch: int

    def __post_init__(self):
        if min(self.major, self.minor, self.patch) < 0:
            raise ValueError("version numbers must be non-negative")

    @classmethod
    def parse(cls, text):
        parts = text.split(".")
        if len(parts) != 3:
            raise ValueError(f"expected MAJOR.MINOR.PATCH, got {text!r}")
        return cls(*(int(p) for p in parts))

    def __str__(self):
        return f"{self.major}.{self.minor}.{self.patch}"
`,
    explanation: `**Generated boilerplate.** \`@dataclass(frozen=True, order=True)\` writes \`__init__\`, \`__repr__\`, \`__eq__\`, the four ordering methods and immutability for you. Ordering compares \`(major, minor, patch)\` as a tuple, which is exactly semantic-version precedence; comparing the strings would wrongly put \`1.10.0\` before \`1.2.9\`.

**Validation hook.** \`__post_init__\` runs right after the generated \`__init__\`, so invalid objects can never exist. \`parse\` is an alternative constructor (\`classmethod\`), and \`int()\` itself raises \`ValueError\` for non-numeric parts.

C++20 gets the same comparisons with \`auto operator<=>(const Version&) const = default;\`.`,
  },
  {
    id: 'python-object-model-e03', lang: 'cpp', title: 'Checked<T>: a descriptor-like wrapper', difficulty: 2,
    task: `Emulate Python's validating descriptor with a template.

- \`template <typename T> class Checked\`: constructor \`Checked(std::function<bool(const T&)> ok, T initial)\`; it throws \`std::invalid_argument\` if \`initial\` is invalid. \`void set(const T& v)\` throws \`std::invalid_argument\` (leaving the old value) when \`ok(v)\` is false; \`const T& get() const\`.
- \`class Product\` built from \`Product(std::string name, double price)\` using \`Checked<std::string>\` (name must be non-empty) and \`Checked<double>\` (price must be >= 0). Methods: \`const std::string& name() const\`, \`double price() const\`, \`void setName(const std::string&)\`, \`void setPrice(double)\`. The constructor throws \`std::invalid_argument\` for invalid values.

~~~cpp
Product p("pen", 1.5);
p.setPrice(2.0);
p.setPrice(-1);   // throws std::invalid_argument, price stays 2.0
~~~`,
    starter: `#include <functional>
#include <stdexcept>
#include <string>
#include <utility>

template <typename T>
class Checked {
    std::function<bool(const T&)> ok_;
    T value_;
public:
    Checked(std::function<bool(const T&)> ok, T initial)
        : ok_(std::move(ok)), value_(std::move(initial)) {}
    void set(const T& v) { value_ = v; }
    const T& get() const { return value_; }
};

class Product {
    Checked<std::string> name_;
    Checked<double> price_;
public:
    Product(std::string name, double price)
        : name_([](const std::string&) { return true; }, std::move(name)),
          price_([](const double&) { return true; }, price) {}
    const std::string& name() const { return name_.get(); }
    double price() const { return price_.get(); }
    void setName(const std::string& n) { name_.set(n); }
    void setPrice(double p) { price_.set(p); }
};
`,
    tests: [
      { name: 'valid values are stored', code: `Product p("pen", 1.5);
EXPECT_EQ(p.name(), std::string("pen"));
EXPECT_NEAR(p.price(), 1.5, 1e-12);
p.setPrice(2.0); p.setName("marker");
EXPECT_NEAR(p.price(), 2.0, 1e-12);
EXPECT_EQ(p.name(), std::string("marker"));` },
      { name: 'invalid setters throw and keep the old value', code: `Product p("pen", 1.5);
EXPECT_THROWS(p.setPrice(-1), std::invalid_argument);
EXPECT_THROWS(p.setName(""), std::invalid_argument);
EXPECT_NEAR(p.price(), 1.5, 1e-12);
EXPECT_EQ(p.name(), std::string("pen"));` },
      { name: 'constructor validates', code: `EXPECT_THROWS(Product("", 1.0), std::invalid_argument);
EXPECT_THROWS(Product("pen", -0.5), std::invalid_argument);` },
      { name: 'Checked works with any predicate', code: `Checked<int> c([](const int& x) { return x % 2 == 0; }, 4);
c.set(10);
EXPECT_EQ(c.get(), 10);
EXPECT_THROWS(c.set(3), std::invalid_argument);
EXPECT_EQ(c.get(), 10);` },
    ],
    hints: [
      'In the Checked constructor body, test the initial value: if (!ok_(value_)) throw std::invalid_argument("invalid initial value");',
      'In set(), check ok_(v) first and throw std::invalid_argument before assigning. In Product, pass predicates: [](const std::string& s) { return !s.empty(); } and [](const double& d) { return d >= 0; }.',
    ],
    solution: `#include <functional>
#include <stdexcept>
#include <string>
#include <utility>

template <typename T>
class Checked {
    std::function<bool(const T&)> ok_;
    T value_;
public:
    Checked(std::function<bool(const T&)> ok, T initial)
        : ok_(std::move(ok)), value_(std::move(initial)) {
        if (!ok_(value_)) throw std::invalid_argument("invalid initial value");
    }
    void set(const T& v) {
        if (!ok_(v)) throw std::invalid_argument("invalid value");
        value_ = v;
    }
    const T& get() const { return value_; }
};

class Product {
    Checked<std::string> name_;
    Checked<double> price_;
public:
    Product(std::string name, double price)
        : name_([](const std::string& s) { return !s.empty(); }, std::move(name)),
          price_([](const double& d) { return d >= 0; }, price) {}
    const std::string& name() const { return name_.get(); }
    double price() const { return price_.get(); }
    void setName(const std::string& n) { name_.set(n); }
    void setPrice(double p) { price_.set(p); }
};
`,
    explanation: `**Validation in one reusable place.** \`Checked<T>\` bundles a value with a predicate and refuses invalid writes, the same job as Python's \`__set__\`. Because it is a template, the same code guards a string, a double or an int, and the checks are resolved at compile time with no reflection needed.

**Strong exception guarantee.** \`set\` validates *before* assigning, so a failed call leaves the old value intact. \`Product\` composes two \`Checked\` members; if the second member's constructor throws, the first is destroyed automatically.

The trade-off against Python: here each guarded member must be declared explicitly with its predicate; Python's \`__set_name__\` gives each descriptor its name automatically.`,
  },
  {
    id: 'python-object-model-e04', lang: 'cpp', title: 'Self-registering exporters', difficulty: 3,
    task: `Emulate \`__init_subclass__\` registries with static self-registration.

- \`struct Exporter\` with a virtual destructor and a pure virtual \`std::string format(const std::string& text) const\`.
- \`class ExporterRegistry\` with only static members: \`using Factory = std::function<std::unique_ptr<Exporter>()>;\`, \`static bool add(const std::string& name, Factory f)\` (returns \`true\` if the name was new, \`false\` if it already existed, keeping the first factory), \`static std::unique_ptr<Exporter> create(const std::string& name)\` (throws \`std::out_of_range\` for an unknown name) and \`static std::size_t size()\`. Store the map in a function-local static so it is initialised on first use.
- \`struct Registrar { Registrar(const std::string& name, ExporterRegistry::Factory f); };\` whose constructor calls \`add\`.
- \`CsvExporter : Exporter\` whose \`format(t)\` returns \`"csv:" + t\`, registered under \`"csv"\` by a namespace-scope \`static Registrar\` object.

~~~cpp
ExporterRegistry::create("csv")->format("a");   // "csv:a"
~~~`,
    starter: `#include <functional>
#include <map>
#include <memory>
#include <stdexcept>
#include <string>

struct Exporter {
    virtual ~Exporter() = default;
    virtual std::string format(const std::string& text) const = 0;
};

class ExporterRegistry {
public:
    using Factory = std::function<std::unique_ptr<Exporter>()>;
    static bool add(const std::string& name, Factory f) { (void)name; (void)f; return false; }
    static std::unique_ptr<Exporter> create(const std::string& name) {
        throw std::out_of_range("unknown exporter: " + name);
    }
    static std::size_t size() { return 0; }
};

struct Registrar {
    Registrar(const std::string& name, ExporterRegistry::Factory f) { (void)name; (void)f; }
};
`,
    tests: [
      { name: 'csv registered before main', code: `auto e = ExporterRegistry::create("csv");
EXPECT_EQ(e->format("a"), std::string("csv:a"));` },
      { name: 'unknown name throws', code: `EXPECT_THROWS(ExporterRegistry::create("nope-xyz"), std::out_of_range);` },
      { name: 'add reports new names and size grows', code: `struct Upper : Exporter {
    std::string format(const std::string& t) const override { return "U" + t; }
};
std::size_t before = ExporterRegistry::size();
ExporterRegistry::Factory f = [] { return std::unique_ptr<Exporter>(new Upper); };
EXPECT(ExporterRegistry::add("upper-test", f));
EXPECT_EQ(ExporterRegistry::size(), before + 1);
EXPECT_EQ(ExporterRegistry::create("upper-test")->format("x"), std::string("Ux"));` },
      { name: 'duplicate name keeps the first factory', code: `ExporterRegistry::Factory g = [] { return std::unique_ptr<Exporter>(); };
std::size_t before = ExporterRegistry::size();
EXPECT(!ExporterRegistry::add("csv", g));
EXPECT_EQ(ExporterRegistry::size(), before);
EXPECT_EQ(ExporterRegistry::create("csv")->format("b"), std::string("csv:b"));` },
    ],
    hints: [
      'Add a private helper: static std::map<std::string, Factory>& table() { static std::map<std::string, Factory> t; return t; } and use it in add, create and size.',
      'add: return table().emplace(name, std::move(f)).second; create: find the name, throw std::out_of_range if missing, else call the factory. Registrar calls ExporterRegistry::add in its constructor. Finally define CsvExporter and a namespace-scope: static Registrar csvReg("csv", [] { return std::unique_ptr<Exporter>(new CsvExporter); });',
    ],
    solution: `#include <functional>
#include <map>
#include <memory>
#include <stdexcept>
#include <string>

struct Exporter {
    virtual ~Exporter() = default;
    virtual std::string format(const std::string& text) const = 0;
};

class ExporterRegistry {
    static std::map<std::string, std::function<std::unique_ptr<Exporter>()>>& table() {
        static std::map<std::string, std::function<std::unique_ptr<Exporter>()>> t;
        return t;
    }
public:
    using Factory = std::function<std::unique_ptr<Exporter>()>;
    static bool add(const std::string& name, Factory f) {
        return table().emplace(name, std::move(f)).second;
    }
    static std::unique_ptr<Exporter> create(const std::string& name) {
        auto it = table().find(name);
        if (it == table().end()) throw std::out_of_range("unknown exporter: " + name);
        return it->second();
    }
    static std::size_t size() { return table().size(); }
};

struct Registrar {
    Registrar(const std::string& name, ExporterRegistry::Factory f) {
        ExporterRegistry::add(name, std::move(f));
    }
};

struct CsvExporter : Exporter {
    std::string format(const std::string& text) const override { return "csv:" + text; }
};

static Registrar csvReg("csv", [] { return std::unique_ptr<Exporter>(new CsvExporter); });
`,
    explanation: `**Registration as a side effect of definition.** Python's \`__init_subclass__\` runs when a subclass is defined. C++ has no such hook, but a namespace-scope object's constructor runs before \`main\`, so \`static Registrar csvReg(...)\` records \`CsvExporter\` as a side effect of the translation unit being linked in.

**Safe initialisation order.** The map lives in a function-local static (the "construct on first use" idiom), so it exists no matter which static object registers first; a plain global map could be used before it is constructed.

The factory returns \`std::unique_ptr<Exporter>\`, so callers get polymorphic objects with clear ownership. The design applies the *open/closed principle*: adding a format means adding one class and one registrar, with no edits to the registry.`,
  },
];
