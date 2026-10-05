export default [
  {
    id: 'patterns-1-e01', lang: 'cpp', title: 'Decorated beverages', difficulty: 2,
    task: `Implement the **Decorator** pattern for a coffee shop.

- \`class Beverage\`: abstract, virtual destructor, \`virtual double cost() const = 0\` and \`virtual std::string description() const = 0\`.
- \`Espresso\`: cost \`2.00\`, description \`"Espresso"\`.
- Wrappers \`Milk\` (+0.50, appends \`", milk"\`), \`Sugar\` (+0.25, appends \`", sugar"\`) and \`Whip\` (+0.75, appends \`", whip"\`). Each has an \`explicit\` constructor taking \`std::unique_ptr<Beverage>\`, is itself a \`Beverage\`, and delegates to the wrapped one.

~~~cpp
std::unique_ptr<Beverage> b =
    std::make_unique<Sugar>(std::make_unique<Milk>(std::make_unique<Espresso>()));
b->cost();          // 2.75
b->description();   // "Espresso, milk, sugar"
~~~`,
    starter: `#include <memory>
#include <string>

class Beverage {
public:
    virtual ~Beverage() = default;
    virtual double cost() const = 0;
    virtual std::string description() const = 0;
};

class Espresso : public Beverage {
public:
    double cost() const override { return 0.0; }          // TODO
    std::string description() const override { return ""; }  // TODO
};

class Milk : public Beverage {
public:
    explicit Milk(std::unique_ptr<Beverage> inner) {}      // TODO: keep the inner beverage
    double cost() const override { return 0.0; }          // TODO
    std::string description() const override { return ""; }  // TODO
};

class Sugar : public Beverage {
public:
    explicit Sugar(std::unique_ptr<Beverage> inner) {}     // TODO
    double cost() const override { return 0.0; }          // TODO
    std::string description() const override { return ""; }  // TODO
};

class Whip : public Beverage {
public:
    explicit Whip(std::unique_ptr<Beverage> inner) {}      // TODO
    double cost() const override { return 0.0; }          // TODO
    std::string description() const override { return ""; }  // TODO
};
`,
    tests: [
      { name: 'structure', code: `EXPECT((std::is_abstract_v<Beverage>));
EXPECT((std::is_base_of_v<Beverage, Espresso>));
EXPECT((std::is_base_of_v<Beverage, Milk>));
EXPECT((std::is_base_of_v<Beverage, Sugar>));
EXPECT((std::is_base_of_v<Beverage, Whip>));` },
      { name: 'plain espresso', code: `Espresso e;
EXPECT_NEAR(e.cost(), 2.0, 1e-9);
EXPECT_EQ(e.description(), std::string("Espresso"));` },
      { name: 'single wrapper', code: `Milk m(std::make_unique<Espresso>());
EXPECT_NEAR(m.cost(), 2.5, 1e-9);
EXPECT_EQ(m.description(), std::string("Espresso, milk"));` },
      { name: 'stacked wrappers', code: `std::unique_ptr<Beverage> b =
    std::make_unique<Sugar>(std::make_unique<Milk>(std::make_unique<Espresso>()));
EXPECT_NEAR(b->cost(), 2.75, 1e-9);
EXPECT_EQ(b->description(), std::string("Espresso, milk, sugar"));` },
      { name: 'same wrapper twice and whip', code: `std::unique_ptr<Beverage> b =
    std::make_unique<Whip>(std::make_unique<Milk>(std::make_unique<Milk>(std::make_unique<Espresso>())));
EXPECT_NEAR(b->cost(), 3.75, 1e-9);
EXPECT_EQ(b->description(), std::string("Espresso, milk, milk, whip"));` },
    ],
    hints: [
      'Each wrapper stores the beverage it wraps in a std::unique_ptr<Beverage> member, initialised from the constructor argument with std::move.',
      'cost() is inner_->cost() plus the wrapper\'s own price; description() is inner_->description() plus the suffix.',
      'Milk: double cost() const override { return inner_->cost() + 0.5; } and std::string description() const override { return inner_->description() + ", milk"; }',
    ],
    solution: `#include <memory>
#include <string>
#include <utility>

class Beverage {
public:
    virtual ~Beverage() = default;
    virtual double cost() const = 0;
    virtual std::string description() const = 0;
};

class Espresso : public Beverage {
public:
    double cost() const override { return 2.0; }
    std::string description() const override { return "Espresso"; }
};

class Milk : public Beverage {
    std::unique_ptr<Beverage> inner_;
public:
    explicit Milk(std::unique_ptr<Beverage> inner) : inner_(std::move(inner)) {}
    double cost() const override { return inner_->cost() + 0.50; }
    std::string description() const override { return inner_->description() + ", milk"; }
};

class Sugar : public Beverage {
    std::unique_ptr<Beverage> inner_;
public:
    explicit Sugar(std::unique_ptr<Beverage> inner) : inner_(std::move(inner)) {}
    double cost() const override { return inner_->cost() + 0.25; }
    std::string description() const override { return inner_->description() + ", sugar"; }
};

class Whip : public Beverage {
    std::unique_ptr<Beverage> inner_;
public:
    explicit Whip(std::unique_ptr<Beverage> inner) : inner_(std::move(inner)) {}
    double cost() const override { return inner_->cost() + 0.75; }
    std::string description() const override { return inner_->description() + ", whip"; }
};
`,
    explanation: `A decorator **is-a** \`Beverage\` and **has-a** \`Beverage\`: that double relationship is the whole pattern. Because the wrapper has the same interface as the thing it wraps, clients cannot tell them apart, and wrappers stack in any order and any number of times.

Each wrapper delegates to \`inner_\` and adds its own contribution, so behaviour is composed at run time rather than multiplied into subclasses like \`MilkSugarEspresso\`. \`unique_ptr\` makes ownership explicit: the outermost beverage owns the entire chain and the virtual destructor in \`Beverage\` frees it correctly.`,
  },
  {
    id: 'patterns-1-e02', lang: 'cpp', title: 'File tree composite', difficulty: 3,
    task: `Implement the **Composite** pattern for a file tree.

- \`class FsNode\`: abstract, virtual destructor, \`virtual std::string name() const = 0\`, \`virtual int size() const = 0\` and \`virtual std::string render(int indent) const = 0\`.
- \`File(std::string name, int size)\`: \`size()\` is its size. \`render(indent)\` returns \`<2*indent spaces><name> (<size>)\` followed by \`"\\n"\`.
- \`Directory(std::string name)\` with \`void add(std::unique_ptr<FsNode> child)\`. \`size()\` is the sum of its children's sizes (0 when empty). \`render(indent)\` returns \`<2*indent spaces><name>/ (<size>)\` followed by \`"\\n"\`, then each child rendered with \`indent + 1\`, in the order added.

~~~cpp
Directory root("root");
root.add(std::make_unique<File>("a", 10));
auto sub = std::make_unique<Directory>("sub");
sub->add(std::make_unique<File>("b", 5));
root.add(std::move(sub));
root.render(0);
// "root/ (15)\\n  a (10)\\n  sub/ (5)\\n    b (5)\\n"
~~~`,
    starter: `#include <memory>
#include <string>
#include <vector>

class FsNode {
public:
    virtual ~FsNode() = default;
    virtual std::string name() const = 0;
    virtual int size() const = 0;
    virtual std::string render(int indent) const = 0;
};

class File : public FsNode {
public:
    File(std::string name, int size) {}  // TODO
    std::string name() const override { return ""; }
    int size() const override { return 0; }
    std::string render(int indent) const override { return ""; }
};

class Directory : public FsNode {
public:
    explicit Directory(std::string name) {}  // TODO
    void add(std::unique_ptr<FsNode> child) {}  // TODO
    std::string name() const override { return ""; }
    int size() const override { return 0; }
    std::string render(int indent) const override { return ""; }
};
`,
    tests: [
      { name: 'structure', code: `EXPECT((std::is_abstract_v<FsNode>));
EXPECT((std::is_base_of_v<FsNode, File>));
EXPECT((std::is_base_of_v<FsNode, Directory>));
EXPECT((std::has_virtual_destructor_v<FsNode>));` },
      { name: 'file basics', code: `File f("a.txt", 42);
EXPECT_EQ(f.name(), std::string("a.txt"));
EXPECT_EQ(f.size(), 42);
EXPECT_EQ(f.render(0), std::string("a.txt (42)\\n"));
EXPECT_EQ(f.render(2), std::string("    a.txt (42)\\n"));` },
      { name: 'empty directory', code: `Directory d("empty");
EXPECT_EQ(d.size(), 0);
EXPECT_EQ(d.name(), std::string("empty"));
EXPECT_EQ(d.render(0), std::string("empty/ (0)\\n"));` },
      { name: 'size is recursive', code: `Directory root("root");
root.add(std::make_unique<File>("a", 10));
auto sub = std::make_unique<Directory>("sub");
sub->add(std::make_unique<File>("b", 5));
sub->add(std::make_unique<File>("c", 7));
root.add(std::move(sub));
EXPECT_EQ(root.size(), 22);` },
      { name: 'render tree', code: `Directory root("root");
root.add(std::make_unique<File>("a", 10));
auto sub = std::make_unique<Directory>("sub");
sub->add(std::make_unique<File>("b", 5));
sub->add(std::make_unique<File>("c", 7));
root.add(std::move(sub));
EXPECT_EQ(root.render(0), std::string("root/ (22)\\n  a (10)\\n  sub/ (12)\\n    b (5)\\n    c (7)\\n"));` },
      { name: 'uniform treatment through the base interface', code: `std::vector<std::unique_ptr<FsNode>> nodes;
nodes.push_back(std::make_unique<File>("x", 3));
nodes.push_back(std::make_unique<Directory>("d"));
int total = 0;
for (auto& n : nodes) total += n->size();
EXPECT_EQ(total, 3);` },
    ],
    hints: [
      'Directory owns a std::vector<std::unique_ptr<FsNode>>; add() simply push_backs the moved pointer.',
      'Directory::size() loops over the children and sums child->size(); it does not need to know whether a child is a file or a directory.',
      'Directory::render: start with std::string(indent * 2, \' \') + name_ + "/ (" + std::to_string(size()) + ")\\n", then append child->render(indent + 1) for each child.',
    ],
    solution: `#include <memory>
#include <string>
#include <utility>
#include <vector>

class FsNode {
public:
    virtual ~FsNode() = default;
    virtual std::string name() const = 0;
    virtual int size() const = 0;
    virtual std::string render(int indent) const = 0;
};

class File : public FsNode {
    std::string name_;
    int size_;
public:
    File(std::string name, int size) : name_(std::move(name)), size_(size) {}
    std::string name() const override { return name_; }
    int size() const override { return size_; }
    std::string render(int indent) const override {
        return std::string(indent * 2, ' ') + name_ + " (" + std::to_string(size_) + ")\\n";
    }
};

class Directory : public FsNode {
    std::string name_;
    std::vector<std::unique_ptr<FsNode>> children_;
public:
    explicit Directory(std::string name) : name_(std::move(name)) {}
    void add(std::unique_ptr<FsNode> child) { children_.push_back(std::move(child)); }
    std::string name() const override { return name_; }
    int size() const override {
        int total = 0;
        for (const auto& c : children_) total += c->size();
        return total;
    }
    std::string render(int indent) const override {
        std::string out = std::string(indent * 2, ' ') + name_ + "/ (" + std::to_string(size()) + ")\\n";
        for (const auto& c : children_) out += c->render(indent + 1);
        return out;
    }
};
`,
    explanation: `\`File\` (leaf) and \`Directory\` (composite) implement the same \`FsNode\` interface, so a directory can hold files and other directories without ever checking which is which. \`size()\` and \`render()\` are naturally **recursive**: a directory asks each child, and each child answers in its own way.

Ownership is explicit: the directory owns its children through \`unique_ptr\`, so destroying the root frees the whole tree, and the virtual destructor on \`FsNode\` makes that deletion correct. The \`indent\` parameter is how the recursion passes depth down so that children are printed one level deeper.`,
  },
  {
    id: 'patterns-1-e03', lang: 'python', title: 'SQL query builder', difficulty: 2,
    task: `Implement a fluent **Builder** for SQL strings.

\`QueryBuilder\` (no constructor arguments) with chainable methods that each return \`self\`:
- \`select(*columns)\`: the columns to select. If \`select\` is never called, use \`*\`.
- \`from_(table)\`: the table name (required).
- \`where(condition)\`: may be called several times; conditions are joined with \`" AND "\`. Optional.
- \`order_by(column)\`: optional.
- \`build()\` returns the string \`SELECT <cols> FROM <table> [WHERE <conds>] [ORDER BY <col>]\` (columns joined with \`", "\`). If \`from_\` was never called it raises \`ValueError\`.

~~~python
QueryBuilder().select("a", "b").from_("t").where("x > 1").order_by("a").build()
# "SELECT a, b FROM t WHERE x > 1 ORDER BY a"
~~~`,
    starter: `class QueryBuilder:
    def __init__(self):
        raise NotImplementedError

    def select(self, *columns):
        raise NotImplementedError

    def from_(self, table):
        raise NotImplementedError

    def where(self, condition):
        raise NotImplementedError

    def order_by(self, column):
        raise NotImplementedError

    def build(self):
        raise NotImplementedError
`,
    tests: [
      { name: 'full query', code: `q = QueryBuilder().select("a", "b").from_("t").where("x > 1").order_by("a").build()
assert q == "SELECT a, b FROM t WHERE x > 1 ORDER BY a", q` },
      { name: 'defaults to star', code: `assert QueryBuilder().from_("users").build() == "SELECT * FROM users"` },
      { name: 'multiple where conditions', code: `q = QueryBuilder().from_("t").where("a = 1").where("b = 2").build()
assert q == "SELECT * FROM t WHERE a = 1 AND b = 2", q` },
      { name: 'methods are chainable', code: `b = QueryBuilder()
assert b.select("a") is b
assert b.from_("t") is b
assert b.where("x") is b
assert b.order_by("a") is b` },
      { name: 'missing table raises ValueError', code: `try:
    QueryBuilder().select("a").build()
except ValueError:
    pass
else:
    raise AssertionError("build() without from_ must raise ValueError")` },
    ],
    hints: [
      'Store the pieces in __init__: self._columns = [], self._table = None, self._wheres = [], self._order = None. Every setter ends with return self.',
      'In build(), check self._table first and raise ValueError("table is required") if it is None.',
      'Assemble with parts = ["SELECT " + (", ".join(self._columns) or "*"), "FROM " + self._table], then append WHERE / ORDER BY parts if set, and return " ".join(parts).',
    ],
    solution: `class QueryBuilder:
    def __init__(self):
        self._columns = []
        self._table = None
        self._wheres = []
        self._order = None

    def select(self, *columns):
        self._columns = list(columns)
        return self

    def from_(self, table):
        self._table = table
        return self

    def where(self, condition):
        self._wheres.append(condition)
        return self

    def order_by(self, column):
        self._order = column
        return self

    def build(self):
        if self._table is None:
            raise ValueError("from_() is required")
        parts = ["SELECT " + (", ".join(self._columns) or "*"), "FROM " + self._table]
        if self._wheres:
            parts.append("WHERE " + " AND ".join(self._wheres))
        if self._order:
            parts.append("ORDER BY " + self._order)
        return " ".join(parts)
`,
    explanation: `The builder accumulates **state step by step** and only produces the final string in \`build()\`. Returning \`self\` from every setter gives the fluent chain. Because the validation lives in \`build()\`, an incomplete query can never escape the builder: that is the main reason to prefer a Builder over loose keyword arguments when the pieces depend on each other.

In everyday Python, a function with keyword arguments often replaces a builder, but when construction has multiple optional steps, repeated parts (several \`where\` calls) and a validation rule, the Builder pattern keeps the call site readable and the invariants in one place.`,
  },
  {
    id: 'patterns-1-e04', lang: 'python', title: 'Thermometer adapter', difficulty: 2,
    task: `A legacy sensor reports Fahrenheit; the rest of your code expects \`read_celsius()\`. Write an **Adapter**.

\`LegacyThermometer\` is given below (do not change it). Add:
- \`ThermometerAdapter(legacy)\` with \`read_celsius()\` returning \`round((f - 32) * 5 / 9, 2)\` where \`f = legacy.get_fahrenheit()\`.
- \`average_celsius(sensors)\` takes any iterable of objects having \`read_celsius()\` (adapters and native sensors mixed) and returns their average rounded to 2 decimals; \`0.0\` for no sensors.

~~~python
sensors = [ThermometerAdapter(LegacyThermometer(212.0)), NativeSensor(20.0)]
average_celsius(sensors)   # 60.0
~~~`,
    starter: `class LegacyThermometer:
    def __init__(self, fahrenheit):
        self._f = fahrenheit

    def get_fahrenheit(self):
        return self._f


class ThermometerAdapter:
    def __init__(self, legacy):
        raise NotImplementedError

    def read_celsius(self):
        raise NotImplementedError


def average_celsius(sensors):
    raise NotImplementedError
`,
    tests: [
      { name: 'converts known values', code: `assert ThermometerAdapter(LegacyThermometer(212.0)).read_celsius() == 100.0
assert ThermometerAdapter(LegacyThermometer(32.0)).read_celsius() == 0.0
assert ThermometerAdapter(LegacyThermometer(98.6)).read_celsius() == 37.0` },
      { name: 'rounds to two decimals', code: `assert ThermometerAdapter(LegacyThermometer(100.0)).read_celsius() == 37.78` },
      { name: 'adapter wraps the legacy object', code: `t = LegacyThermometer(50.0)
a = ThermometerAdapter(t)
assert a.read_celsius() == 10.0
t._f = 68.0
assert a.read_celsius() == 20.0, "the adapter should read from the wrapped sensor each time"` },
      { name: 'average mixes adapters and native sensors', code: `class Native:
    def __init__(self, c): self.c = c
    def read_celsius(self): return self.c

sensors = [ThermometerAdapter(LegacyThermometer(212.0)), Native(20.0)]
assert average_celsius(sensors) == 60.0` },
      { name: 'average of nothing', code: `assert average_celsius([]) == 0.0
assert average_celsius(iter([])) == 0.0` },
    ],
    hints: [
      'The adapter just keeps a reference to the legacy object in __init__ and converts on every read_celsius() call.',
      'average_celsius should work with any iterable: first turn it into a list of readings with [s.read_celsius() for s in sensors].',
      'if not readings: return 0.0; otherwise return round(sum(readings) / len(readings), 2).',
    ],
    solution: `class LegacyThermometer:
    def __init__(self, fahrenheit):
        self._f = fahrenheit

    def get_fahrenheit(self):
        return self._f


class ThermometerAdapter:
    def __init__(self, legacy):
        self._legacy = legacy

    def read_celsius(self):
        f = self._legacy.get_fahrenheit()
        return round((f - 32) * 5 / 9, 2)


def average_celsius(sensors):
    readings = [s.read_celsius() for s in sensors]
    if not readings:
        return 0.0
    return round(sum(readings) / len(readings), 2)
`,
    explanation: `The **Adapter** translates one interface into another without touching the adapted class: \`ThermometerAdapter\` exposes \`read_celsius()\` and internally calls the legacy \`get_fahrenheit()\`. Because it reads from the wrapped sensor on every call, it always reflects the current state.

\`average_celsius\` demonstrates the payoff: it depends only on "something with \`read_celsius()\`" (duck typing, in C++ terms an interface), so adapters and native sensors are interchangeable. The legacy code stays frozen, and the conversion rule lives in exactly one place.`,
  },
];
