export default [
  {
    id: 'solid-e01', lang: 'cpp', title: 'Discounts without editing the checkout', difficulty: 2,
    task: `Apply the **Open/Closed Principle**: a checkout that works with any discount, including ones written later.

- \`class DiscountPolicy\`: abstract, with a virtual destructor and \`virtual double apply(double amount) const = 0\`.
- \`NoDiscount\`: \`apply\` returns the amount unchanged.
- \`PercentageDiscount(double pct)\`: \`apply\` returns \`amount * (1 - pct / 100)\`.
- \`BulkDiscount(double threshold, double off)\`: if \`amount >= threshold\` returns \`amount - off\`, otherwise the amount unchanged.
- \`Checkout(const DiscountPolicy& policy)\` stores the policy (by reference) and has \`double total(const std::vector<double>& prices) const\`: it sums the prices, then applies the policy once to the subtotal.

All three policies derive publicly from \`DiscountPolicy\`; mark overrides with \`override\`.

~~~cpp
PercentageDiscount ten(10);
Checkout c(ten);
c.total({50.0, 50.0});   // 90.0
~~~`,
    starter: `#include <vector>

class DiscountPolicy {
public:
    virtual ~DiscountPolicy() = default;
    virtual double apply(double amount) const = 0;
};

class NoDiscount : public DiscountPolicy {
public:
    double apply(double amount) const override { return 0.0; }  // TODO
};

class PercentageDiscount : public DiscountPolicy {
public:
    explicit PercentageDiscount(double pct) {}  // TODO: store pct
    double apply(double amount) const override { return 0.0; }  // TODO
};

class BulkDiscount : public DiscountPolicy {
public:
    BulkDiscount(double threshold, double off) {}  // TODO: store both
    double apply(double amount) const override { return 0.0; }  // TODO
};

class Checkout {
public:
    explicit Checkout(const DiscountPolicy& policy) {}  // TODO: keep a reference
    double total(const std::vector<double>& prices) const { return 0.0; }  // TODO
};
`,
    tests: [
      { name: 'policy is abstract and policies derive from it', code: `EXPECT((std::is_abstract_v<DiscountPolicy>));
EXPECT((std::is_base_of_v<DiscountPolicy, NoDiscount>));
EXPECT((std::is_base_of_v<DiscountPolicy, PercentageDiscount>));
EXPECT((std::is_base_of_v<DiscountPolicy, BulkDiscount>));
EXPECT((std::has_virtual_destructor_v<DiscountPolicy>));` },
      { name: 'no discount', code: `NoDiscount n;
Checkout c(n);
EXPECT_NEAR(c.total({10.0, 20.5}), 30.5, 1e-9);
EXPECT_NEAR(c.total({}), 0.0, 1e-9);` },
      { name: 'percentage discount', code: `PercentageDiscount p(10);
Checkout c(p);
EXPECT_NEAR(c.total({50.0, 50.0}), 90.0, 1e-9);` },
      { name: 'bulk discount threshold', code: `BulkDiscount b(100, 15);
Checkout c(b);
EXPECT_NEAR(c.total({60.0, 60.0}), 105.0, 1e-9);
EXPECT_NEAR(c.total({10.0, 20.0}), 30.0, 1e-9);
EXPECT_NEAR(c.total({100.0}), 85.0, 1e-9);` },
      { name: 'a new policy works without changing Checkout', code: `struct Half : DiscountPolicy {
    double apply(double a) const override { return a / 2; }
};
Half h;
Checkout c(h);
EXPECT_NEAR(c.total({10.0, 30.0}), 20.0, 1e-9);` },
    ],
    hints: [
      'Checkout only needs to know about DiscountPolicy: store a const DiscountPolicy& member and call policy_.apply(subtotal).',
      'Each concrete policy stores its own parameters in members and implements apply() in a single line or two.',
      'total(): double sum = 0; for (double p : prices) sum += p; return policy_.apply(sum);',
    ],
    solution: `#include <vector>

class DiscountPolicy {
public:
    virtual ~DiscountPolicy() = default;
    virtual double apply(double amount) const = 0;
};

class NoDiscount : public DiscountPolicy {
public:
    double apply(double amount) const override { return amount; }
};

class PercentageDiscount : public DiscountPolicy {
    double pct_;
public:
    explicit PercentageDiscount(double pct) : pct_(pct) {}
    double apply(double amount) const override { return amount * (1 - pct_ / 100); }
};

class BulkDiscount : public DiscountPolicy {
    double threshold_, off_;
public:
    BulkDiscount(double threshold, double off) : threshold_(threshold), off_(off) {}
    double apply(double amount) const override {
        return amount >= threshold_ ? amount - off_ : amount;
    }
};

class Checkout {
    const DiscountPolicy& policy_;
public:
    explicit Checkout(const DiscountPolicy& policy) : policy_(policy) {}
    double total(const std::vector<double>& prices) const {
        double sum = 0;
        for (double p : prices) sum += p;
        return policy_.apply(sum);
    }
};
`,
    explanation: `**Open for extension, closed for modification.** \`Checkout\` depends only on the abstract \`DiscountPolicy\`. A new rule (the test defines a \`Half\` policy on the spot) is a new class; \`Checkout\` is never edited and never re-tested.

The \`if/else\` on customer type that this replaces moves into the type system: each policy owns one rule, and a virtual call picks the right one at run time. The virtual destructor keeps deletion through a base pointer safe, and holding the policy by \`const&\` expresses that Checkout uses but does not own it.`,
  },
  {
    id: 'solid-e02', lang: 'cpp', title: 'Order service with injected dependencies', difficulty: 3,
    task: `Apply **Dependency Inversion**: \`OrderService\` must not know about concrete storage or messaging.

- \`struct Order { std::string id; double amount; };\`
- \`class OrderRepository\`: abstract, virtual destructor, \`virtual void save(const Order& o) = 0\` and \`virtual std::size_t count() const = 0\`.
- \`class Notifier\`: abstract, virtual destructor, \`virtual void notify(const std::string& message) = 0\`.
- \`InMemoryOrderRepository\` implements \`OrderRepository\` with a \`std::vector<Order>\`.
- \`OrderService(OrderRepository& repo, Notifier& notifier)\` has \`void place(const Order& o)\`:
  1. if \`o.id\` is empty or \`o.amount <= 0\`, throw \`std::invalid_argument\` and do **not** save or notify;
  2. otherwise save the order, then call \`notifier.notify("Order " + o.id + " placed")\`.

~~~cpp
InMemoryOrderRepository repo;
// a Notifier fake of your own
OrderService svc(repo, notifier);
svc.place({"A1", 25.0});   // repo.count() == 1, notifier got "Order A1 placed"
~~~`,
    starter: `#include <cstddef>
#include <stdexcept>
#include <string>
#include <vector>

struct Order { std::string id; double amount; };

class OrderRepository {
public:
    virtual ~OrderRepository() = default;
    virtual void save(const Order& o) = 0;
    virtual std::size_t count() const = 0;
};

class Notifier {
public:
    virtual ~Notifier() = default;
    virtual void notify(const std::string& message) = 0;
};

class InMemoryOrderRepository : public OrderRepository {
public:
    void save(const Order& o) override {}                 // TODO
    std::size_t count() const override { return 0; }      // TODO
};

class OrderService {
public:
    OrderService(OrderRepository& repo, Notifier& notifier) {}  // TODO
    void place(const Order& o) {}                                // TODO
};
`,
    tests: [
      { name: 'interfaces are abstract', code: `EXPECT((std::is_abstract_v<OrderRepository>));
EXPECT((std::is_abstract_v<Notifier>));
EXPECT((std::is_base_of_v<OrderRepository, InMemoryOrderRepository>));` },
      { name: 'in-memory repository counts saved orders', code: `InMemoryOrderRepository repo;
EXPECT_EQ(repo.count(), std::size_t(0));
repo.save({"X", 1.0});
repo.save({"Y", 2.0});
EXPECT_EQ(repo.count(), std::size_t(2));` },
      { name: 'place saves and notifies', code: `struct FakeNotifier : Notifier {
    std::vector<std::string> msgs;
    void notify(const std::string& m) override { msgs.push_back(m); }
};
InMemoryOrderRepository repo;
FakeNotifier n;
OrderService svc(repo, n);
svc.place({"A1", 25.0});
EXPECT_EQ(repo.count(), std::size_t(1));
EXPECT_EQ(n.msgs.size(), std::size_t(1));
EXPECT_EQ(n.msgs[0], std::string("Order A1 placed"));` },
      { name: 'invalid orders are rejected without side effects', code: `struct FakeNotifier : Notifier {
    int calls = 0;
    void notify(const std::string&) override { ++calls; }
};
InMemoryOrderRepository repo;
FakeNotifier n;
OrderService svc(repo, n);
EXPECT_THROWS(svc.place({"", 10.0}), std::invalid_argument);
EXPECT_THROWS(svc.place({"B", 0.0}), std::invalid_argument);
EXPECT_THROWS(svc.place({"B", -5.0}), std::invalid_argument);
EXPECT_EQ(repo.count(), std::size_t(0));
EXPECT_EQ(n.calls, 0);` },
      { name: 'any repository works', code: `struct CountingRepo : OrderRepository {
    int saves = 0;
    void save(const Order&) override { ++saves; }
    std::size_t count() const override { return saves; }
};
struct Silent : Notifier { void notify(const std::string&) override {} };
CountingRepo repo;
Silent n;
OrderService svc(repo, n);
svc.place({"Z", 1.0});
svc.place({"Q", 2.0});
EXPECT_EQ(repo.saves, 2);` },
    ],
    hints: [
      'Store the two collaborators as references (OrderRepository& and Notifier&) initialised in the constructor initializer list.',
      'Validate first and throw std::invalid_argument before touching repo_ or notifier_.',
      'After validation: repo_.save(o); notifier_.notify("Order " + o.id + " placed");',
    ],
    solution: `#include <cstddef>
#include <stdexcept>
#include <string>
#include <vector>

struct Order { std::string id; double amount; };

class OrderRepository {
public:
    virtual ~OrderRepository() = default;
    virtual void save(const Order& o) = 0;
    virtual std::size_t count() const = 0;
};

class Notifier {
public:
    virtual ~Notifier() = default;
    virtual void notify(const std::string& message) = 0;
};

class InMemoryOrderRepository : public OrderRepository {
    std::vector<Order> orders_;
public:
    void save(const Order& o) override { orders_.push_back(o); }
    std::size_t count() const override { return orders_.size(); }
};

class OrderService {
    OrderRepository& repo_;
    Notifier& notifier_;
public:
    OrderService(OrderRepository& repo, Notifier& notifier)
        : repo_(repo), notifier_(notifier) {}
    void place(const Order& o) {
        if (o.id.empty() || o.amount <= 0)
            throw std::invalid_argument("invalid order");
        repo_.save(o);
        notifier_.notify("Order " + o.id + " placed");
    }
};
`,
    explanation: `\`OrderService\` is the **high-level policy** (validate, save, notify) and depends only on the abstractions \`OrderRepository\` and \`Notifier\`, which it needs. The concrete details (an in-memory repository, a test fake, later a real database or mailer) implement those interfaces and are **injected** through the constructor.

That is Dependency Inversion: the source-code dependency arrows point at abstractions. The payoff is visible in the tests, which use tiny fakes and need no database. Validating before any side effect also keeps the service from leaving half-done work behind.`,
  },
  {
    id: 'solid-e03', lang: 'python', title: 'Split the god class Report', difficulty: 2,
    task: `\`Report\` below formats, computes and writes. Apply the **Single Responsibility Principle** by building four small pieces. Rows are a list of \`(label, amount)\` tuples.

- \`ReportData(rows)\`: stores \`rows\`; \`totals()\` returns the sum of all amounts.
- \`ReportFormatter\` (no constructor arguments):
  - \`to_text(data)\` returns one \`"<label>: <amount>"\` line per row, then a final \`"TOTAL: <total>"\` line, joined by \`"\\n"\` (no trailing newline).
  - \`to_csv(data)\` returns \`"label,amount"\` then one \`"<label>,<amount>"\` line per row, joined by \`"\\n"\`.
- \`ReportWriter(sink)\`: \`sink\` is any callable taking a string; \`write(text)\` calls \`sink(text)\`.

\`ReportData\` must not format or write; \`ReportFormatter\` must not write. You may keep or delete the old \`Report\`.

~~~python
data = ReportData([("rent", 100), ("food", 50)])
ReportFormatter().to_text(data)   # "rent: 100\\nfood: 50\\nTOTAL: 150"
ReportWriter(print).write("hi")   # prints hi
~~~`,
    starter: `class Report:
    """God class: computes, formats and writes. Split it up."""
    def __init__(self, rows):
        self.rows = rows

    def totals(self):
        return sum(a for _, a in self.rows)

    def to_text(self):
        lines = [f"{l}: {a}" for l, a in self.rows]
        return "\\n".join(lines + [f"TOTAL: {self.totals()}"])

    def write(self, sink):
        sink(self.to_text())


class ReportData:
    def __init__(self, rows):
        raise NotImplementedError

    def totals(self):
        raise NotImplementedError


class ReportFormatter:
    def to_text(self, data):
        raise NotImplementedError

    def to_csv(self, data):
        raise NotImplementedError


class ReportWriter:
    def __init__(self, sink):
        raise NotImplementedError

    def write(self, text):
        raise NotImplementedError
`,
    tests: [
      { name: 'ReportData totals', code: `d = ReportData([("a", 10), ("b", 5)])
assert d.rows == [("a", 10), ("b", 5)], "rows should be stored"
assert d.totals() == 15
assert ReportData([]).totals() == 0` },
      { name: 'formatter text', code: `d = ReportData([("rent", 100), ("food", 50)])
assert ReportFormatter().to_text(d) == "rent: 100\\nfood: 50\\nTOTAL: 150", ReportFormatter().to_text(d)` },
      { name: 'formatter csv', code: `d = ReportData([("rent", 100), ("food", 50)])
assert ReportFormatter().to_csv(d) == "label,amount\\nrent,100\\nfood,50", ReportFormatter().to_csv(d)` },
      { name: 'writer sends text to the sink', code: `out = []
ReportWriter(out.append).write("hello")
assert out == ["hello"], out
printed = capture(lambda: ReportWriter(print).write("hi"))
assert printed.strip() == "hi", printed` },
      { name: 'responsibilities are separated', code: `assert not hasattr(ReportData, "to_text") and not hasattr(ReportData, "write"), "ReportData must only hold and total data"
assert not hasattr(ReportFormatter, "write"), "the formatter must not write"
assert not hasattr(ReportWriter, "to_text"), "the writer must not format"` },
    ],
    hints: [
      'Each class gets just one job: ReportData holds rows and sums them, ReportFormatter turns data into strings, ReportWriter hands a string to a sink.',
      'The formatter receives a ReportData, so it can call data.rows and data.totals() instead of recomputing.',
      'to_text: "\\n".join([f"{l}: {a}" for l, a in data.rows] + [f"TOTAL: {data.totals()}"])',
    ],
    solution: `class ReportData:
    def __init__(self, rows):
        self.rows = rows

    def totals(self):
        return sum(amount for _, amount in self.rows)


class ReportFormatter:
    def to_text(self, data):
        lines = [f"{label}: {amount}" for label, amount in data.rows]
        lines.append(f"TOTAL: {data.totals()}")
        return "\\n".join(lines)

    def to_csv(self, data):
        lines = ["label,amount"]
        lines += [f"{label},{amount}" for label, amount in data.rows]
        return "\\n".join(lines)


class ReportWriter:
    def __init__(self, sink):
        self.sink = sink

    def write(self, text):
        self.sink(text)
`,
    explanation: `The god class had three reasons to change: the arithmetic, the output format and the destination. Each now lives in its own class, so adding \`to_json\` touches only \`ReportFormatter\`, and writing to a file instead of the console touches only the sink you pass in.

The writer takes a **callable** rather than a concrete file or console class, a small touch of Dependency Inversion that also makes it trivially testable (\`out.append\` is a perfectly good sink). Each piece can be unit-tested alone, which is a practical sign that SRP is working.`,
  },
  {
    id: 'solid-e04', lang: 'python', title: 'Small interfaces for office devices', difficulty: 2,
    task: `Apply **Interface Segregation** with structural interfaces.

Define three \`@runtime_checkable\` \`typing.Protocol\` classes:
- \`Printer\` with \`print_doc(self, doc)\`
- \`Scanner\` with \`scan(self)\`
- \`Fax\` with \`fax(self, doc)\`

Then:
- \`BasicPrinter\` implements **only** \`print_doc(doc)\`, returning \`"printed: " + doc\`. It must not have \`scan\` or \`fax\`.
- \`MultiFunctionDevice\` implements all three: \`print_doc(doc)\` returns \`"printed: " + doc\`, \`scan()\` returns \`"scanned"\`, \`fax(doc)\` returns \`"faxed: " + doc\`.
- \`print_all(printer, docs)\` calls \`printer.print_doc(d)\` for each doc and returns the list of results. It only needs a \`Printer\`.

~~~python
print_all(BasicPrinter(), ["a", "b"])   # ["printed: a", "printed: b"]
isinstance(BasicPrinter(), Scanner)      # False
~~~`,
    starter: `from typing import Protocol, runtime_checkable


@runtime_checkable
class Printer(Protocol):
    def print_doc(self, doc): ...


@runtime_checkable
class Scanner(Protocol):
    def scan(self): ...


@runtime_checkable
class Fax(Protocol):
    def fax(self, doc): ...


class BasicPrinter:
    def print_doc(self, doc):
        raise NotImplementedError


class MultiFunctionDevice:
    def print_doc(self, doc):
        raise NotImplementedError

    def scan(self):
        raise NotImplementedError

    def fax(self, doc):
        raise NotImplementedError


def print_all(printer, docs):
    raise NotImplementedError
`,
    tests: [
      { name: 'BasicPrinter only prints', code: `p = BasicPrinter()
assert p.print_doc("x") == "printed: x"
assert not hasattr(p, "scan"), "BasicPrinter must not have scan"
assert not hasattr(p, "fax"), "BasicPrinter must not have fax"` },
      { name: 'protocol membership of BasicPrinter', code: `p = BasicPrinter()
assert isinstance(p, Printer)
assert not isinstance(p, Scanner)
assert not isinstance(p, Fax)` },
      { name: 'MultiFunctionDevice does everything', code: `m = MultiFunctionDevice()
assert m.print_doc("d") == "printed: d"
assert m.scan() == "scanned"
assert m.fax("d") == "faxed: d"
assert isinstance(m, Printer) and isinstance(m, Scanner) and isinstance(m, Fax)` },
      { name: 'print_all works with any printer', code: `assert print_all(BasicPrinter(), ["a", "b"]) == ["printed: a", "printed: b"]
assert print_all(MultiFunctionDevice(), ["z"]) == ["printed: z"]
assert print_all(BasicPrinter(), []) == []` },
    ],
    hints: [
      'BasicPrinter should simply not define scan or fax; the Protocols describe roles, so there is nothing to inherit.',
      'runtime_checkable makes isinstance check that the required methods exist on the object.',
      'print_all: return [printer.print_doc(d) for d in docs]',
    ],
    solution: `from typing import Protocol, runtime_checkable


@runtime_checkable
class Printer(Protocol):
    def print_doc(self, doc): ...


@runtime_checkable
class Scanner(Protocol):
    def scan(self): ...


@runtime_checkable
class Fax(Protocol):
    def fax(self, doc): ...


class BasicPrinter:
    def print_doc(self, doc):
        return "printed: " + doc


class MultiFunctionDevice:
    def print_doc(self, doc):
        return "printed: " + doc

    def scan(self):
        return "scanned"

    def fax(self, doc):
        return "faxed: " + doc


def print_all(printer, docs):
    return [printer.print_doc(d) for d in docs]
`,
    explanation: `One fat \`Machine\` interface would force \`BasicPrinter\` to implement \`scan\` and \`fax\` with stubs that raise errors, an ISP violation that also breaks substitutability. Three tiny role interfaces fix both: a class offers exactly the roles it really has.

\`typing.Protocol\` makes the roles *structural*, so \`BasicPrinter\` needs no inheritance, and \`print_all\` asks only for a \`Printer\`: it never learns whether the device can also scan or fax. Clients depend on the narrowest interface they use.`,
  },
];
