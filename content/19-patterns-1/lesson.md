## What is a design pattern?

Every team that builds a plugin system, an undo stack or a file tree ends up inventing the same solution. A **design pattern** is a named, proven solution to a recurring design problem. It is a *shared vocabulary* ("make that a Decorator") and a sketch of roles and responsibilities, **not** a template to paste. The Gang of Four catalogue groups patterns as **creational** (how objects are made: Singleton, Factory Method, Builder), **structural** (how objects are composed: Adapter, Decorator, Composite) and **behavioural** (how objects cooperate, Module 20).

> **Note:** Many patterns exist to work around limits of a language. Python's first-class functions, modules and keyword arguments make several of them nearly disappear, so each section ends with how it collapses in Python.

## Singleton (creational)

**Intent:** exactly one instance with a global access point. **Problem:** a configuration or logger that must be shared.

~~~text
Client --> Config::instance() --> [the one Config]
~~~

~~~cpp
class Config {
public:
    static Config& instance() {
        static Config c;          // C++11: initialised once, thread-safe
        return c;
    }
    Config(const Config&) = delete;
    Config& operator=(const Config&) = delete;
    std::string name = "default";
private:
    Config() = default;
};
Config::instance().name = "prod";
~~~
~~~python
class Config:
    _instance = None
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

Config() is Config()    # True
~~~

**In Python this often collapses to** a module: `config.py` is imported once and its globals are shared by everyone.

**When not to use it:** almost always. A singleton is a hidden global; tests cannot replace it and order-dependent state leaks between them. Prefer creating one object at startup and **injecting** it (Module 18).

## Factory Method (creational)

**Intent:** let callers ask for an object by a name or kind without naming the concrete class. **Problem:** `if kind == "circle": return Circle(...)` repeated across the code base.

~~~text
Client --> ShapeFactory.create("circle") --> Shape <|-- Circle, Square
~~~

~~~cpp
using Maker = std::function<std::unique_ptr<Shape>()>;
std::map<std::string, Maker> registry = {
    {"circle", [] { return std::make_unique<Circle>(); }},
    {"square", [] { return std::make_unique<Square>(); }},
};
std::unique_ptr<Shape> make(const std::string& k) { return registry.at(k)(); }
~~~
~~~python
registry = {"circle": Circle, "square": Square}

def make(kind):
    return registry[kind]()      # classes are callables
~~~

**In Python this often collapses to** a dict of classes: a class *is* its own factory function.

**When not to use it:** when there is a single concrete type and the constructor call is already clear.

## Builder (creational)

**Intent:** construct a complex object step by step. **Problem:** *telescoping constructors* such as `Pizza(size, true, false, true, "")`.

~~~text
Client --> Builder.a().b().c() --> build() --> Product
~~~

~~~cpp
class QueryBuilder {
    std::string table_, where_;
public:
    QueryBuilder& from(std::string t)  { table_ = std::move(t); return *this; }
    QueryBuilder& where(std::string w) { where_ = std::move(w); return *this; }
    std::string build() const { return "SELECT * FROM " + table_ + (where_.empty() ? "" : " WHERE " + where_); }
};
auto q = QueryBuilder().from("users").where("age > 18").build();
~~~
~~~python
def build_query(table, where=None):
    q = f"SELECT * FROM {table}"
    return q + (f" WHERE {where}" if where else "")

q = build_query("users", where="age > 18")
~~~

**In Python this often collapses to** keyword arguments with defaults, or a `dataclass`. Builders still pay off when steps must be validated together in `build()`, or when the result is immutable.

**When not to use it:** objects with two or three parameters.

## Adapter (structural)

**Intent:** make an existing class fit the interface clients expect. **Problem:** a third-party or legacy API does not match yours.

~~~text
Client --> Thermometer (Celsius) <|-- Adapter --> LegacySensor (Fahrenheit)
~~~

~~~cpp
struct LegacySensor { double getFahrenheit() const { return 98.6; } };
struct Thermometer { virtual double celsius() const = 0; virtual ~Thermometer() = default; };
class SensorAdapter : public Thermometer {
    LegacySensor s_;
public:
    double celsius() const override { return (s_.getFahrenheit() - 32) * 5 / 9; }
};
~~~
~~~python
class LegacySensor:
    def get_fahrenheit(self): return 98.6

class SensorAdapter:
    def __init__(self, sensor): self._s = sensor
    def celsius(self):
        return (self._s.get_fahrenheit() - 32) * 5 / 9
~~~

**In Python this often collapses to** a small function or lambda when only one method needs converting. **When not to use it:** when you own the legacy code; just change it.

## Decorator (structural)

**Intent:** add behaviour to an object dynamically by wrapping it in an object with the same interface. **Problem:** `MilkCoffee`, `SugarCoffee`, `MilkSugarCoffee`... a subclass explosion.

~~~text
Beverage <|-- Espresso
Beverage <|-- Milk (has-a Beverage) <|-- Sugar (has-a Beverage)
~~~

~~~cpp
struct Beverage {
    virtual ~Beverage() = default;
    virtual double cost() const = 0;
    virtual std::string description() const = 0;
};
struct Espresso : Beverage {
    double cost() const override { return 2.0; }
    std::string description() const override { return "Espresso"; }
};
class Milk : public Beverage {
    std::unique_ptr<Beverage> inner_;
public:
    explicit Milk(std::unique_ptr<Beverage> b) : inner_(std::move(b)) {}
    double cost() const override { return inner_->cost() + 0.5; }
    std::string description() const override { return inner_->description() + ", milk"; }
};
~~~
~~~python
class Espresso:
    def cost(self): return 2.0
    def description(self): return "Espresso"

class Milk:
    def __init__(self, inner): self.inner = inner
    def cost(self): return self.inner.cost() + 0.5
    def description(self): return self.inner.description() + ", milk"

Milk(Milk(Espresso())).cost()   # 3.0
~~~

> **C++ vs Python:** Python's `@decorator` syntax wraps a *function* with another function (logging, caching). It is the same idea of wrapping, but it works on callables at definition time; the GoF Decorator wraps *objects* at run time and stacks per instance.

**When not to use it:** when the wrappers are order-sensitive or you need to inspect the concrete layers; long chains are hard to debug.

## Composite (structural)

**Intent:** treat individual objects and groups of objects uniformly. **Problem:** code that asks "is this a file or a folder?" everywhere.

~~~text
Node <|-- File
Node <|-- Directory (has-many Node)
~~~

~~~cpp
struct Node {
    virtual ~Node() = default;
    virtual int size() const = 0;
};
struct File : Node {
    int bytes;
    explicit File(int b) : bytes(b) {}
    int size() const override { return bytes; }
};
struct Dir : Node {
    std::vector<std::unique_ptr<Node>> kids;
    int size() const override {
        int t = 0;
        for (auto& k : kids) t += k->size();
        return t;
    }
};
~~~
~~~python
class File:
    def __init__(self, bytes): self.bytes = bytes
    def size(self): return self.bytes

class Dir:
    def __init__(self): self.kids = []
    def size(self): return sum(k.size() for k in self.kids)
~~~

Callers write `root.size()` and never care whether `root` is a leaf or a tree.

**When not to use it:** when leaves and containers genuinely have different operations; a forced common interface fills up with methods that throw.

## Choosing and not over-using

Name the *problem* first (many variants? incompatible API? too many parameters?) and only then the pattern. Patterns add indirection; use one when it removes more complexity than it adds.

## Key takeaways

- A pattern is a named solution to a recurring problem, and a shared vocabulary.
- Singleton is a hidden global; prefer injecting one shared instance.
- Factory Method hides which concrete class gets built; in Python a dict of classes is enough.
- Builder replaces telescoping constructors; Python keyword arguments often suffice.
- Adapter converts an existing interface to the one clients expect.
- Decorator wraps an object with the same interface to add behaviour without subclass explosion.
- Composite makes leaves and groups interchangeable behind one interface.

## Common pitfalls

- Treating patterns as goals and forcing them into simple code.
- Using a Singleton for convenience and then being unable to test.
- Confusing Python's `@decorator` syntax with the Decorator pattern.
- Letting Adapter grow business logic instead of translating only.
- Composite with a fat interface where leaves throw "not supported".
