## Why SOLID?

Code rarely dies because it is wrong; it dies because every change breaks something unrelated. **SOLID** is five design heuristics that keep change local: Single responsibility, Open/closed, Liskov substitution, Interface segregation and Dependency inversion. Each section below shows a *smell*, the *refactor*, the rule in one sentence and how to spot a violation.

## S: Single Responsibility

A class that formats, saves and emails a report changes whenever the format, the storage or the mail server changes.

~~~cpp
class Report {
public:
    std::string title, body;
    std::string toHtml() const { return "<h1>" + title + "</h1>" + body; }
    void saveToFile(const std::string& path) const { /* open, write */ }
    void email(const std::string& to) const { /* SMTP */ }
};
~~~
~~~python
class Report:
    def __init__(self, title, body):
        self.title, self.body = title, body
    def to_html(self):  return f"<h1>{self.title}</h1>{self.body}"
    def save_to_file(self, path): ...   # I/O
    def email(self, to): ...            # network
~~~

Refactor: keep `Report` as data and give each reason to change its own class.

~~~cpp
struct Report { std::string title, body; };
struct HtmlFormatter { std::string format(const Report& r) const; };
struct FileSaver     { void save(const std::string& text, const std::string& path) const; };
struct Mailer        { void send(const std::string& text, const std::string& to) const; };
~~~
~~~python
@dataclass
class Report:
    title: str
    body: str

class HtmlFormatter:
    def format(self, r): return f"<h1>{r.title}</h1>{r.body}"
class FileSaver:
    def save(self, text, path): ...
class Mailer:
    def send(self, text, to): ...
~~~

**Rule:** a class should have one reason to change. **Spot it:** the class name needs "And"/"Manager", its imports span unrelated domains, or one edit touches methods that share no data.

> **Note:** "One thing" does not mean "one method". It means one *axis of change* (one stakeholder), not a function that does one step.

## O: Open/Closed

New behaviour should arrive by adding code, not editing tested code. An `if/elif` on customer type must be edited for every new kind.

~~~cpp
double price(double amount, const std::string& kind) {
    if (kind == "regular") return amount;
    if (kind == "vip")     return amount * 0.9;
    return amount;           // every new kind edits this function
}
~~~
~~~python
def price(amount, kind):
    if kind == "regular": return amount
    elif kind == "vip":   return amount * 0.9
    return amount             # every new kind edits this function
~~~

Refactor: one policy object per rule; the calculator depends only on the abstraction.

~~~cpp
struct DiscountPolicy {
    virtual ~DiscountPolicy() = default;
    virtual double apply(double amount) const = 0;
};
struct VipDiscount : DiscountPolicy {
    double apply(double a) const override { return a * 0.9; }
};
double price(double amount, const DiscountPolicy& p) { return p.apply(amount); }
~~~
~~~python
class VipDiscount:
    def apply(self, amount): return amount * 0.9

def price(amount, policy):
    return policy.apply(amount)   # a new class needs no edit here
~~~

**Rule:** open for extension, closed for modification. **Spot it:** a growing `switch`/`elif` on a type or tag that appears in several places.

## L: Liskov Substitution

Code written against a base type must keep working for every subtype. Subtypes may not strengthen preconditions or weaken promises.

~~~cpp
struct Bird { virtual void fly() { /* flap */ } virtual ~Bird() = default; };
struct Penguin : Bird {
    void fly() override { throw std::logic_error("penguins cannot fly"); }
};
~~~
~~~python
class Bird:
    def fly(self): return "flap"
class Penguin(Bird):
    def fly(self): raise NotImplementedError("penguins cannot fly")
~~~

Refactor: split the capabilities so that only things that can fly promise `fly`.

~~~cpp
struct Bird { virtual ~Bird() = default; virtual std::string name() const = 0; };
struct FlyingBird : Bird { virtual std::string fly() const = 0; };
struct Penguin : Bird { std::string name() const override { return "penguin"; } };
~~~
~~~python
class Bird: ...
class FlyingBird(Bird):
    def fly(self): ...
class Penguin(Bird): ...      # never promised fly()
~~~

The classic variant is `Square : Rectangle`: `setWidth` on a square must also change the height, so code that sets width then height and expects `w*h` breaks. "Is-a" in the real world is not "is-substitutable-for" in code; compare *behavioural contracts*.

**Rule:** subtypes must be usable wherever the base type is expected. **Spot it:** overrides that throw "not supported", `isinstance`/`dynamic_cast` checks in client code, empty overrides.

## I: Interface Segregation

Clients should not depend on methods they do not use. A fat `Worker` forces a robot to pretend it eats.

~~~cpp
struct Worker { virtual void work() = 0; virtual void eat() = 0; virtual ~Worker() = default; };
struct Robot : Worker {
    void work() override {}
    void eat() override { throw std::logic_error("robots do not eat"); }
};
~~~
~~~python
class Worker(ABC):
    @abstractmethod
    def work(self): ...
    @abstractmethod
    def eat(self): ...
class Robot(Worker):
    def work(self): ...
    def eat(self): raise NotImplementedError   # forced lie
~~~

Refactor: role interfaces; a class implements only the roles it has.

~~~cpp
struct Workable { virtual void work() = 0; virtual ~Workable() = default; };
struct Eatable  { virtual void eat() = 0;  virtual ~Eatable() = default; };
struct Robot : Workable { void work() override {} };
struct Human : Workable, Eatable { void work() override {} void eat() override {} };
~~~
~~~python
class Workable(Protocol):
    def work(self): ...
class Eatable(Protocol):
    def eat(self): ...
class Robot:
    def work(self): ...          # structurally a Workable only
~~~

**Rule:** many small, client-specific interfaces beat one general one. **Spot it:** stub methods, or a mock that must implement ten methods to test one.

## D: Dependency Inversion

High-level policy should depend on abstractions, not on concrete details. An `OrderService` that builds its own `MySqlDatabase` cannot be tested without a database.

~~~cpp
class OrderService {
    MySqlDatabase db;                 // hard-wired detail
public:
    void place(const Order& o) { db.insert(o); }
};
~~~
~~~python
class OrderService:
    def __init__(self):
        self.db = MySqlDatabase()    # hard-wired detail
    def place(self, order): self.db.insert(order)
~~~

Refactor: define the abstraction the service *needs*, inject it through the constructor, and test with an in-memory fake.

~~~cpp
struct Repository { virtual void save(const Order&) = 0; virtual ~Repository() = default; };
class OrderService {
    Repository& repo_;
public:
    explicit OrderService(Repository& r) : repo_(r) {}
    void place(const Order& o) { repo_.save(o); }
};
struct InMemoryRepo : Repository {
    std::vector<Order> orders;
    void save(const Order& o) override { orders.push_back(o); }
};
~~~
~~~python
class OrderService:
    def __init__(self, repo):
        self.repo = repo
    def place(self, order): self.repo.save(order)

class InMemoryRepo:
    def __init__(self): self.orders = []
    def save(self, order): self.orders.append(order)
~~~

> **C++ vs Python:** C++ expresses the abstraction as an abstract class; Python can use an `ABC` or a structural `typing.Protocol`, and at runtime plain duck typing is enough.

**Rule:** depend on abstractions; let the caller (or a composition root) choose the concrete class. **Spot it:** `new`/constructor calls of infrastructure classes inside business logic, imports of drivers in domain code.

## SOLID in moderation

Principles are pressure valves, not goals. Do not create an interface for a class with one implementation and no tests that need a fake (**YAGNI**). Abstract when you feel the *second* variant coming, not before. Ten tiny classes and three layers of indirection for a 20-line script is a bigger smell than a slightly long function.

> **Pitfall:** applying OCP everywhere produces a plug-in architecture nobody asked for. Refactor when the change actually arrives; the tests you have let you do it safely.

## Key takeaways

- SRP: one reason to change, meaning one stakeholder or axis of change.
- OCP: add behaviour by adding classes, not by editing a tested `switch`.
- LSP: subtypes honour the base contract; a throwing override is a design alarm.
- ISP: small role interfaces; implement only what you really do.
- DIP: depend on abstractions and inject them; fakes make tests fast.
- Constructor injection makes dependencies explicit and visible.
- Apply the principles when change hurts, not pre-emptively.

## Common pitfalls

- Reading SRP as "each class has one method" and shredding cohesive code.
- Inheriting because of a real-world "is-a" and breaking behavioural contracts (LSP).
- Using `NotImplementedError`/`throw` in an override instead of splitting the interface.
- Injecting a concrete class and calling it dependency inversion.
- Abstracting everything up front and paying the complexity cost for nothing.
