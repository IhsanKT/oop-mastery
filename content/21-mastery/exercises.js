const SHAPE_CPP_SOLUTION = `#include <algorithm>
#include <cmath>
#include <iomanip>
#include <memory>
#include <numbers>
#include <ostream>
#include <stdexcept>
#include <string>
#include <vector>

class Shape {
public:
    virtual ~Shape() = default;
    virtual double area() const = 0;
    virtual double perimeter() const = 0;
    virtual std::string name() const = 0;
};

class Circle : public Shape {
    double r_;
public:
    explicit Circle(double r) : r_(r) {
        if (r <= 0) throw std::invalid_argument("radius must be positive");
    }
    double area() const override { return std::numbers::pi * r_ * r_; }
    double perimeter() const override { return 2 * std::numbers::pi * r_; }
    std::string name() const override { return "Circle"; }
};

class Rectangle : public Shape {
    double w_, h_;
public:
    Rectangle(double w, double h) : w_(w), h_(h) {
        if (w <= 0 || h <= 0) throw std::invalid_argument("sides must be positive");
    }
    double area() const override { return w_ * h_; }
    double perimeter() const override { return 2 * (w_ + h_); }
    std::string name() const override { return "Rectangle"; }
};

class Triangle : public Shape {
    double a_, b_, c_;
public:
    Triangle(double a, double b, double c) : a_(a), b_(b), c_(c) {
        if (a <= 0 || b <= 0 || c <= 0 || a + b <= c || a + c <= b || b + c <= a)
            throw std::invalid_argument("not a valid triangle");
    }
    double area() const override {
        double s = (a_ + b_ + c_) / 2;
        return std::sqrt(s * (s - a_) * (s - b_) * (s - c_));
    }
    double perimeter() const override { return a_ + b_ + c_; }
    std::string name() const override { return "Triangle"; }
};

class Canvas {
    std::vector<std::unique_ptr<Shape>> shapes_;
public:
    void add(std::unique_ptr<Shape> s) {
        if (!s) throw std::invalid_argument("null shape");
        shapes_.push_back(std::move(s));
    }
    std::size_t size() const { return shapes_.size(); }
    double totalArea() const {
        double t = 0;
        for (const auto& s : shapes_) t += s->area();
        return t;
    }
    const Shape& largest() const {
        if (shapes_.empty()) throw std::out_of_range("empty canvas");
        auto it = std::max_element(shapes_.begin(), shapes_.end(),
            [](const auto& a, const auto& b) { return a->area() < b->area(); });
        return **it;
    }
    std::vector<std::string> sortedByArea() const {
        std::vector<const Shape*> v;
        for (const auto& s : shapes_) v.push_back(s.get());
        std::stable_sort(v.begin(), v.end(),
            [](const Shape* a, const Shape* b) { return a->area() < b->area(); });
        std::vector<std::string> names;
        for (const Shape* s : v) names.push_back(s->name());
        return names;
    }
    bool remove(const std::string& name) {
        auto it = std::find_if(shapes_.begin(), shapes_.end(),
            [&](const auto& s) { return s->name() == name; });
        if (it == shapes_.end()) return false;
        shapes_.erase(it);
        return true;
    }
    friend std::ostream& operator<<(std::ostream& os, const Canvas& c) {
        return os << "Canvas(" << c.size() << " shapes, area="
                  << std::fixed << std::setprecision(2) << c.totalArea() << ")";
    }
};
`;

const SHAPE_CPP_STARTER = `#include <memory>
#include <ostream>
#include <string>
#include <vector>

class Shape {
public:
    virtual ~Shape() = default;
    virtual double area() const = 0;
    virtual double perimeter() const = 0;
    virtual std::string name() const = 0;
};

class Circle : public Shape {
public:
    explicit Circle(double r) {}  // TODO: validate and store
    double area() const override { return 0; }
    double perimeter() const override { return 0; }
    std::string name() const override { return ""; }
};

class Rectangle : public Shape {
public:
    Rectangle(double w, double h) {}  // TODO
    double area() const override { return 0; }
    double perimeter() const override { return 0; }
    std::string name() const override { return ""; }
};

class Triangle : public Shape {
public:
    Triangle(double a, double b, double c) {}  // TODO
    double area() const override { return 0; }
    double perimeter() const override { return 0; }
    std::string name() const override { return ""; }
};

class Canvas {
public:
    void add(std::unique_ptr<Shape> s) {}  // TODO
    std::size_t size() const { return 0; }
    double totalArea() const { return 0; }
    const Shape& largest() const { static Circle c(1); return c; }  // TODO
    std::vector<std::string> sortedByArea() const { return {}; }
    bool remove(const std::string& name) { return false; }
    friend std::ostream& operator<<(std::ostream& os, const Canvas& c) { return os; }  // TODO
};
`;

const BANK_CPP_SOLUTION = `#include <functional>
#include <map>
#include <memory>
#include <stdexcept>
#include <string>
#include <utility>
#include <vector>

class BankError : public std::runtime_error {
public:
    using std::runtime_error::runtime_error;
};
class InsufficientFunds : public BankError {
public:
    InsufficientFunds() : BankError("insufficient funds") {}
};
class AccountNotFound : public BankError {
public:
    explicit AccountNotFound(int id) : BankError("account not found: " + std::to_string(id)) {}
};

class Account {
    std::string owner_;
protected:
    double balance_;
    virtual double minAllowed() const { return 0.0; }
public:
    Account(std::string owner, double initial = 0.0) : owner_(std::move(owner)), balance_(initial) {}
    virtual ~Account() = default;
    const std::string& owner() const { return owner_; }
    double balance() const { return balance_; }
    void deposit(double amount) {
        if (amount <= 0) throw std::invalid_argument("amount must be positive");
        balance_ += amount;
    }
    virtual void withdraw(double amount) {
        if (amount <= 0) throw std::invalid_argument("amount must be positive");
        if (balance_ - amount < minAllowed()) throw InsufficientFunds();
        balance_ -= amount;
    }
};

class SavingsAccount : public Account {
    double minBalance_;
protected:
    double minAllowed() const override { return minBalance_; }
public:
    SavingsAccount(std::string owner, double initial, double minBalance)
        : Account(std::move(owner), initial), minBalance_(minBalance) {}
    void addInterest(double rate) {
        if (rate < 0) throw std::invalid_argument("rate must not be negative");
        balance_ += balance_ * rate;
    }
};

class CheckingAccount : public Account {
    double overdraft_;
protected:
    double minAllowed() const override { return -overdraft_; }
public:
    CheckingAccount(std::string owner, double initial, double overdraftLimit)
        : Account(std::move(owner), initial), overdraft_(overdraftLimit) {}
};

class Bank {
public:
    using Listener = std::function<void(const std::string&)>;
private:
    std::map<int, std::unique_ptr<Account>> accounts_;
    std::vector<Listener> listeners_;
    inline static int next_id_ = 1;
    void notify(const std::string& event) {
        for (auto& l : listeners_) l(event);
    }
public:
    int open(std::unique_ptr<Account> account) {
        if (!account) throw std::invalid_argument("null account");
        int id = next_id_++;
        accounts_[id] = std::move(account);
        return id;
    }
    Account& get(int id) {
        auto it = accounts_.find(id);
        if (it == accounts_.end()) throw AccountNotFound(id);
        return *it->second;
    }
    void deposit(int id, double amount) {
        get(id).deposit(amount);
        notify("deposit " + std::to_string(id));
    }
    void withdraw(int id, double amount) {
        get(id).withdraw(amount);
        notify("withdraw " + std::to_string(id));
    }
    void transfer(int from, int to, double amount) {
        Account& src = get(from);
        Account& dst = get(to);
        src.withdraw(amount);   // may throw: nothing has changed yet
        dst.deposit(amount);    // cannot fail: amount was validated by withdraw
        notify("transfer " + std::to_string(from) + "->" + std::to_string(to));
    }
    void addListener(Listener l) { listeners_.push_back(std::move(l)); }
};
`;

const BANK_CPP_STARTER = `#include <functional>
#include <memory>
#include <stdexcept>
#include <string>

class BankError : public std::runtime_error {
public:
    using std::runtime_error::runtime_error;
};
class InsufficientFunds : public BankError {
public:
    InsufficientFunds() : BankError("insufficient funds") {}
};
class AccountNotFound : public BankError {
public:
    explicit AccountNotFound(int id) : BankError("account not found: " + std::to_string(id)) {}
};

class Account {
protected:
    double balance_ = 0;  // TODO: keep protected, store the initial balance
public:
    Account(std::string owner, double initial = 0.0) {}
    virtual ~Account() = default;
    const std::string& owner() const { static std::string s; return s; }  // TODO
    double balance() const { return 0; }                                  // TODO
    void deposit(double amount) {}                                        // TODO
    virtual void withdraw(double amount) {}                               // TODO
};

class SavingsAccount : public Account {
public:
    SavingsAccount(std::string owner, double initial, double minBalance) : Account(owner, initial) {}
    void addInterest(double rate) {}  // TODO
};

class CheckingAccount : public Account {
public:
    CheckingAccount(std::string owner, double initial, double overdraftLimit) : Account(owner, initial) {}
};

class Bank {
public:
    using Listener = std::function<void(const std::string&)>;
    int open(std::unique_ptr<Account> account) { return 0; }  // TODO
    Account& get(int id) { static Account a("x"); return a; }  // TODO
    void deposit(int id, double amount) {}                     // TODO
    void withdraw(int id, double amount) {}                    // TODO
    void transfer(int from, int to, double amount) {}          // TODO
    void addListener(Listener l) {}                            // TODO
};
`;

const LIB_CPP_SOLUTION = `#include <deque>
#include <functional>
#include <map>
#include <memory>
#include <sstream>
#include <stdexcept>
#include <string>
#include <utility>
#include <vector>

class FeePolicy {
public:
    virtual ~FeePolicy() = default;
    virtual double fee(int daysLate) const = 0;
};
class StandardFee : public FeePolicy {
public:
    double fee(int d) const override { return d > 0 ? d * 1.00 : 0.0; }
};
class StudentFee : public FeePolicy {
public:
    double fee(int d) const override { return d > 0 ? d * 0.50 : 0.0; }
};
class SeniorFee : public FeePolicy {
public:
    double fee(int d) const override { return d > 0 ? d * 0.25 : 0.0; }
};

class Command {
public:
    virtual ~Command() = default;
    virtual void execute() = 0;
    virtual void undo() = 0;
};

class Library {
public:
    using Listener = std::function<void(const std::string& member, int bookId)>;
private:
    struct Book {
        std::string title;
        std::string borrower;
        std::deque<std::string> waiting;
    };
    std::map<int, Book> books_;
    std::map<std::string, std::unique_ptr<FeePolicy>> members_;
    std::map<std::string, double> fees_;
    std::vector<Listener> listeners_;
    std::vector<std::unique_ptr<Command>> history_;

    Book& book(int id) {
        auto it = books_.find(id);
        if (it == books_.end()) throw std::runtime_error("no such book");
        return it->second;
    }
    void requireMember(const std::string& name) const {
        if (!members_.count(name)) throw std::runtime_error("no such member");
    }
public:
    void addBook(int id, const std::string& title) {
        if (books_.count(id)) throw std::runtime_error("duplicate book id");
        books_[id] = Book{title, "", {}};
    }
    void addMember(const std::string& name, std::unique_ptr<FeePolicy> policy) {
        members_[name] = std::move(policy);
        fees_.emplace(name, 0.0);
    }
    void checkOut(const std::string& member, int bookId) {
        requireMember(member);
        Book& b = book(bookId);
        if (!b.borrower.empty()) throw std::runtime_error("book already on loan");
        b.borrower = member;
    }
    double giveBack(const std::string& member, int bookId, int daysLate) {
        requireMember(member);
        Book& b = book(bookId);
        if (b.borrower != member) throw std::runtime_error("book is not on loan to this member");
        double fee = members_.at(member)->fee(daysLate);
        fees_[member] += fee;
        b.borrower.clear();
        if (!b.waiting.empty()) {
            std::string next = b.waiting.front();
            b.waiting.pop_front();
            for (auto& l : listeners_) l(next, bookId);
        }
        return fee;
    }
    void undoCheckOut(int bookId) { book(bookId).borrower.clear(); }
    void undoGiveBack(const std::string& member, int bookId, double fee) {
        book(bookId).borrower = member;
        fees_[member] -= fee;
    }
    void reserve(const std::string& member, int bookId) {
        requireMember(member);
        Book& b = book(bookId);
        if (b.borrower.empty()) throw std::runtime_error("book is available; no need to reserve");
        b.waiting.push_back(member);
    }
    void subscribe(Listener l) { listeners_.push_back(std::move(l)); }
    double feesOwed(const std::string& member) const {
        auto it = fees_.find(member);
        if (it == fees_.end()) throw std::runtime_error("no such member");
        return it->second;
    }
    std::string report() const {
        std::ostringstream os;
        for (const auto& [id, b] : books_) {
            os << id << ' ' << b.title << " - "
               << (b.borrower.empty() ? std::string("available") : "on loan to " + b.borrower) << "\\n";
        }
        return os.str();
    }
    void run(std::unique_ptr<Command> c) {
        c->execute();
        history_.push_back(std::move(c));
    }
    bool undoLast() {
        if (history_.empty()) return false;
        history_.back()->undo();
        history_.pop_back();
        return true;
    }
};

class CheckoutCommand : public Command {
    Library& lib_;
    std::string member_;
    int bookId_;
public:
    CheckoutCommand(Library& lib, std::string member, int bookId)
        : lib_(lib), member_(std::move(member)), bookId_(bookId) {}
    void execute() override { lib_.checkOut(member_, bookId_); }
    void undo() override { lib_.undoCheckOut(bookId_); }
};

class ReturnCommand : public Command {
    Library& lib_;
    std::string member_;
    int bookId_;
    int daysLate_;
    double fee_ = 0.0;
public:
    ReturnCommand(Library& lib, std::string member, int bookId, int daysLate)
        : lib_(lib), member_(std::move(member)), bookId_(bookId), daysLate_(daysLate) {}
    void execute() override { fee_ = lib_.giveBack(member_, bookId_, daysLate_); }
    void undo() override { lib_.undoGiveBack(member_, bookId_, fee_); }
};
`;

const LIB_CPP_STARTER = `#include <functional>
#include <memory>
#include <string>

class FeePolicy {
public:
    virtual ~FeePolicy() = default;
    virtual double fee(int daysLate) const = 0;
};
class StandardFee : public FeePolicy {
public:
    double fee(int d) const override { return 0.0; }  // TODO: 1.00 per late day
};
class StudentFee : public FeePolicy {
public:
    double fee(int d) const override { return 0.0; }  // TODO: 0.50 per late day
};
class SeniorFee : public FeePolicy {
public:
    double fee(int d) const override { return 0.0; }  // TODO: 0.25 per late day
};

class Command {
public:
    virtual ~Command() = default;
    virtual void execute() = 0;
    virtual void undo() = 0;
};

class Library {
public:
    using Listener = std::function<void(const std::string& member, int bookId)>;
    void addBook(int id, const std::string& title) {}                                // TODO
    void addMember(const std::string& name, std::unique_ptr<FeePolicy> policy) {}    // TODO
    void checkOut(const std::string& member, int bookId) {}                          // TODO
    double giveBack(const std::string& member, int bookId, int daysLate) { return 0; }  // TODO
    void undoCheckOut(int bookId) {}                                                 // TODO
    void undoGiveBack(const std::string& member, int bookId, double fee) {}          // TODO
    void reserve(const std::string& member, int bookId) {}                           // TODO
    void subscribe(Listener l) {}                                                    // TODO
    double feesOwed(const std::string& member) const { return 0; }                   // TODO
    std::string report() const { return ""; }                                        // TODO
    void run(std::unique_ptr<Command> c) {}                                          // TODO
    bool undoLast() { return false; }                                                // TODO
};

class CheckoutCommand : public Command {
public:
    CheckoutCommand(Library& lib, std::string member, int bookId) {}  // TODO
    void execute() override {}
    void undo() override {}
};

class ReturnCommand : public Command {
public:
    ReturnCommand(Library& lib, std::string member, int bookId, int daysLate) {}  // TODO
    void execute() override {}
    void undo() override {}
};
`;

export default [
  {
    id: 'mastery-e01', lang: 'cpp', title: 'Capstone: Shape Studio (C++)', difficulty: 3,
    task: `Build a small drawing model that combines abstraction, polymorphism, ownership, exceptions and operator overloading.

- \`class Shape\`: abstract; virtual destructor; \`virtual double area() const = 0\`, \`virtual double perimeter() const = 0\`, \`virtual std::string name() const = 0\`.
- \`Circle(double r)\` (name \`"Circle"\`), \`Rectangle(double w, double h)\` (\`"Rectangle"\`) and \`Triangle(double a, double b, double c)\` (\`"Triangle"\`, area by Heron's formula). Non-positive dimensions throw \`std::invalid_argument\`; a triangle that violates the triangle inequality (\`a + b <= c\`, and so on) also throws \`std::invalid_argument\`.
- \`class Canvas\` **owns** its shapes in a \`std::vector<std::unique_ptr<Shape>>\`:
  - \`void add(std::unique_ptr<Shape>)\` (a null pointer throws \`std::invalid_argument\`), \`std::size_t size() const\`, \`double totalArea() const\`.
  - \`const Shape& largest() const\` returns the shape with the greatest area; throws \`std::out_of_range\` on an empty canvas.
  - \`std::vector<std::string> sortedByArea() const\` returns the **names** in ascending area order (stable for ties).
  - \`bool remove(const std::string& name)\` removes the first shape with that name; returns whether one was removed.
  - \`operator<<\` prints \`Canvas(<n> shapes, area=<total, 2 decimals>)\`, e.g. \`Canvas(1 shapes, area=12.57)\` (the word is always \`shapes\`).

~~~cpp
Canvas c;
c.add(std::make_unique<Circle>(2.0));
std::cout << c;   // Canvas(1 shapes, area=12.57)
~~~`,
    starter: SHAPE_CPP_STARTER,
    tests: [
      { name: 'class structure', code: `EXPECT((std::is_abstract_v<Shape>));
EXPECT((std::has_virtual_destructor_v<Shape>));
EXPECT((std::is_base_of_v<Shape, Circle>));
EXPECT((std::is_base_of_v<Shape, Rectangle>));
EXPECT((std::is_base_of_v<Shape, Triangle>));` },
      { name: 'areas, perimeters and names', code: `Circle c(1.0);
EXPECT_NEAR(c.area(), 3.14159265358979, 1e-9);
EXPECT_NEAR(c.perimeter(), 6.28318530717959, 1e-9);
EXPECT_EQ(c.name(), std::string("Circle"));
Rectangle r(2.0, 3.0);
EXPECT_NEAR(r.area(), 6.0, 1e-9);
EXPECT_NEAR(r.perimeter(), 10.0, 1e-9);
EXPECT_EQ(r.name(), std::string("Rectangle"));
Triangle t(3.0, 4.0, 5.0);
EXPECT_NEAR(t.area(), 6.0, 1e-9);
EXPECT_NEAR(t.perimeter(), 12.0, 1e-9);
EXPECT_EQ(t.name(), std::string("Triangle"));` },
      { name: 'invalid dimensions throw', code: `EXPECT_THROWS(Circle(0), std::invalid_argument);
EXPECT_THROWS(Circle(-1), std::invalid_argument);
EXPECT_THROWS(Rectangle(2, -1), std::invalid_argument);
EXPECT_THROWS(Rectangle(0, 5), std::invalid_argument);
EXPECT_THROWS(Triangle(1, 2, 3), std::invalid_argument);
EXPECT_THROWS(Triangle(1, 1, 5), std::invalid_argument);
EXPECT_THROWS(Triangle(0, 1, 1), std::invalid_argument);` },
      { name: 'canvas totals and largest', code: `Canvas c;
c.add(std::make_unique<Circle>(1.0));
c.add(std::make_unique<Rectangle>(2.0, 4.0));
c.add(std::make_unique<Triangle>(3.0, 4.0, 5.0));
EXPECT_EQ(c.size(), std::size_t(3));
EXPECT_NEAR(c.totalArea(), 3.14159265358979 + 8.0 + 6.0, 1e-9);
EXPECT_EQ(c.largest().name(), std::string("Rectangle"));
EXPECT_THROWS(c.add(nullptr), std::invalid_argument);
EXPECT_EQ(c.size(), std::size_t(3));` },
      { name: 'sortedByArea and remove', code: `Canvas c;
c.add(std::make_unique<Rectangle>(2.0, 4.0));
c.add(std::make_unique<Circle>(1.0));
c.add(std::make_unique<Triangle>(3.0, 4.0, 5.0));
EXPECT((c.sortedByArea() == std::vector<std::string>{"Circle", "Triangle", "Rectangle"}));
EXPECT(c.remove("Triangle"));
EXPECT(!c.remove("Triangle"));
EXPECT_EQ(c.size(), std::size_t(2));
EXPECT((c.sortedByArea() == std::vector<std::string>{"Circle", "Rectangle"}));
EXPECT_NEAR(c.totalArea(), 3.14159265358979 + 8.0, 1e-9);` },
      { name: 'stream output and empty canvas', code: `Canvas c;
{
    std::ostringstream os;
    os << c;
    EXPECT_EQ(os.str(), std::string("Canvas(0 shapes, area=0.00)"));
}
EXPECT_THROWS(c.largest(), std::out_of_range);
c.add(std::make_unique<Circle>(2.0));
std::ostringstream os2;
os2 << c;
EXPECT_EQ(os2.str(), std::string("Canvas(1 shapes, area=12.57)"));
c.add(std::make_unique<Rectangle>(1.0, 1.0));
std::ostringstream os3;
os3 << c;
EXPECT_EQ(os3.str(), std::string("Canvas(2 shapes, area=13.57)"));` },
    ],
    hints: [
      'Start with the abstract Shape and the three concrete classes; validate in each constructor with if (...) throw std::invalid_argument(...). Write the interface, then the simplest body, and run the tests after each class.',
      'Canvas stores std::vector<std::unique_ptr<Shape>>. Use std::max_element for largest() and a vector of const Shape* with std::stable_sort for sortedByArea() so ties keep insertion order.',
      'remove(): find_if on name(), erase the iterator. operator<< is a friend: os << "Canvas(" << size() << " shapes, area=" << std::fixed << std::setprecision(2) << totalArea() << ")"; include <iomanip>.',
    ],
    solution: SHAPE_CPP_SOLUTION,
    explanation: `**Abstraction and polymorphism.** \`Shape\` is a pure interface; \`Canvas\` calls \`area()\` and \`name()\` through it and never inspects the concrete type, so a new shape works without touching \`Canvas\`. The virtual destructor makes deleting through \`unique_ptr<Shape>\` correct.

**Invariants and exceptions.** Each constructor refuses to create an invalid object (\`std::invalid_argument\`), so every live shape is valid: you never need to re-check later. \`largest()\` signals misuse on an empty canvas with \`std::out_of_range\`.

**Ownership.** The canvas owns its shapes through \`unique_ptr\` (composition): removing a shape or destroying the canvas frees them automatically, with no manual \`delete\`. \`sortedByArea\` sorts non-owning pointers, so the canvas order is not disturbed. \`operator<<\` is a friend so printing stays a non-member free function that works with any \`std::ostream\`.`,
  },
  {
    id: 'mastery-e02', lang: 'python', title: 'Capstone: Shape Studio (Python)', difficulty: 3,
    task: `Build the same drawing model in Python.

- \`Shape\` is an abstract base class (\`abc.ABC\`) with abstract methods \`area()\`, \`perimeter()\` and \`name()\`. \`Shape()\` itself cannot be instantiated.
- \`Circle(r)\` (name \`"Circle"\`), \`Rectangle(w, h)\` (\`"Rectangle"\`) and \`Triangle(a, b, c)\` (\`"Triangle"\`, Heron's formula). Non-positive dimensions raise \`ValueError\`; a triangle violating the triangle inequality (\`a + b <= c\`, and so on) also raises \`ValueError\`.
- \`Canvas\` owns its shapes in a list:
  - \`add(shape)\` (anything that is not a \`Shape\` raises \`TypeError\`), \`len(canvas)\`, \`total_area()\`.
  - \`largest()\` returns the shape with the greatest area; raises \`ValueError\` when empty.
  - \`sorted_by_area()\` returns the **names** in ascending area order (stable for ties).
  - \`remove(name)\` removes the first shape with that name and returns \`True\`, or returns \`False\` if none.
  - \`str(canvas)\` is \`Canvas(<n> shapes, area=<total, 2 decimals>)\`, e.g. \`Canvas(1 shapes, area=12.57)\`.

~~~python
c = Canvas()
c.add(Circle(2))
str(c)   # 'Canvas(1 shapes, area=12.57)'
~~~`,
    starter: `from abc import ABC, abstractmethod
import math


class Shape(ABC):
    @abstractmethod
    def area(self):
        ...

    @abstractmethod
    def perimeter(self):
        ...

    @abstractmethod
    def name(self):
        ...


class Circle(Shape):
    def __init__(self, r):
        raise NotImplementedError

    def area(self):
        raise NotImplementedError

    def perimeter(self):
        raise NotImplementedError

    def name(self):
        raise NotImplementedError


class Rectangle(Shape):
    def __init__(self, w, h):
        raise NotImplementedError

    def area(self):
        raise NotImplementedError

    def perimeter(self):
        raise NotImplementedError

    def name(self):
        raise NotImplementedError


class Triangle(Shape):
    def __init__(self, a, b, c):
        raise NotImplementedError

    def area(self):
        raise NotImplementedError

    def perimeter(self):
        raise NotImplementedError

    def name(self):
        raise NotImplementedError


class Canvas:
    def __init__(self):
        raise NotImplementedError

    def add(self, shape):
        raise NotImplementedError

    def __len__(self):
        raise NotImplementedError

    def total_area(self):
        raise NotImplementedError

    def largest(self):
        raise NotImplementedError

    def sorted_by_area(self):
        raise NotImplementedError

    def remove(self, name):
        raise NotImplementedError

    def __str__(self):
        raise NotImplementedError
`,
    tests: [
      { name: 'class structure', code: `assert issubclass(Circle, Shape) and issubclass(Rectangle, Shape) and issubclass(Triangle, Shape)
try:
    Shape()
except TypeError:
    pass
else:
    raise AssertionError("Shape must be abstract")` },
      { name: 'areas, perimeters and names', code: `c = Circle(1)
assert abs(c.area() - math.pi) < 1e-9 and abs(c.perimeter() - 2 * math.pi) < 1e-9 and c.name() == "Circle"
r = Rectangle(2, 3)
assert r.area() == 6 and r.perimeter() == 10 and r.name() == "Rectangle"
t = Triangle(3, 4, 5)
assert abs(t.area() - 6) < 1e-9 and t.perimeter() == 12 and t.name() == "Triangle"` },
      { name: 'invalid dimensions raise ValueError', code: `def raises(exc, fn):
    try:
        fn()
    except exc:
        return True
    return False

assert raises(ValueError, lambda: Circle(0))
assert raises(ValueError, lambda: Circle(-1))
assert raises(ValueError, lambda: Rectangle(2, -1))
assert raises(ValueError, lambda: Rectangle(0, 5))
assert raises(ValueError, lambda: Triangle(1, 2, 3))
assert raises(ValueError, lambda: Triangle(1, 1, 5))
assert raises(ValueError, lambda: Triangle(0, 1, 1))` },
      { name: 'canvas totals and largest', code: `c = Canvas()
c.add(Circle(1))
c.add(Rectangle(2, 4))
c.add(Triangle(3, 4, 5))
assert len(c) == 3
assert abs(c.total_area() - (math.pi + 8 + 6)) < 1e-9
assert c.largest().name() == "Rectangle"
try:
    c.add("not a shape")
except TypeError:
    pass
else:
    raise AssertionError("add() must reject non-shapes")
assert len(c) == 3` },
      { name: 'sorted_by_area and remove', code: `c = Canvas()
c.add(Rectangle(2, 4))
c.add(Circle(1))
c.add(Triangle(3, 4, 5))
assert c.sorted_by_area() == ["Circle", "Triangle", "Rectangle"]
assert c.remove("Triangle") is True
assert c.remove("Triangle") is False
assert len(c) == 2
assert c.sorted_by_area() == ["Circle", "Rectangle"]
assert abs(c.total_area() - (math.pi + 8)) < 1e-9` },
      { name: 'string form and empty canvas', code: `c = Canvas()
assert str(c) == "Canvas(0 shapes, area=0.00)", str(c)
try:
    c.largest()
except ValueError:
    pass
else:
    raise AssertionError("largest() on an empty canvas must raise ValueError")
c.add(Circle(2))
assert str(c) == "Canvas(1 shapes, area=12.57)", str(c)
c.add(Rectangle(1, 1))
assert str(c) == "Canvas(2 shapes, area=13.57)", str(c)` },
    ],
    hints: [
      'Validate in each __init__ and raise ValueError. Heron: s = (a + b + c) / 2; area = math.sqrt(s * (s - a) * (s - b) * (s - c)).',
      'Canvas keeps self._shapes = []. largest() is max(self._shapes, key=lambda s: s.area()); sorted() is stable, so sorted(self._shapes, key=...) keeps ties in insertion order.',
      'remove(): loop with enumerate, del self._shapes[i] and return True on the first name match, else False. __str__: f"Canvas({len(self)} shapes, area={self.total_area():.2f})".',
    ],
    solution: `from abc import ABC, abstractmethod
import math


class Shape(ABC):
    @abstractmethod
    def area(self):
        ...

    @abstractmethod
    def perimeter(self):
        ...

    @abstractmethod
    def name(self):
        ...


class Circle(Shape):
    def __init__(self, r):
        if r <= 0:
            raise ValueError("radius must be positive")
        self._r = r

    def area(self):
        return math.pi * self._r ** 2

    def perimeter(self):
        return 2 * math.pi * self._r

    def name(self):
        return "Circle"


class Rectangle(Shape):
    def __init__(self, w, h):
        if w <= 0 or h <= 0:
            raise ValueError("sides must be positive")
        self._w, self._h = w, h

    def area(self):
        return self._w * self._h

    def perimeter(self):
        return 2 * (self._w + self._h)

    def name(self):
        return "Rectangle"


class Triangle(Shape):
    def __init__(self, a, b, c):
        if min(a, b, c) <= 0 or a + b <= c or a + c <= b or b + c <= a:
            raise ValueError("not a valid triangle")
        self._a, self._b, self._c = a, b, c

    def area(self):
        s = self.perimeter() / 2
        return math.sqrt(s * (s - self._a) * (s - self._b) * (s - self._c))

    def perimeter(self):
        return self._a + self._b + self._c

    def name(self):
        return "Triangle"


class Canvas:
    def __init__(self):
        self._shapes = []

    def add(self, shape):
        if not isinstance(shape, Shape):
            raise TypeError("only Shape objects can be added")
        self._shapes.append(shape)

    def __len__(self):
        return len(self._shapes)

    def total_area(self):
        return sum(s.area() for s in self._shapes)

    def largest(self):
        if not self._shapes:
            raise ValueError("empty canvas")
        return max(self._shapes, key=lambda s: s.area())

    def sorted_by_area(self):
        return [s.name() for s in sorted(self._shapes, key=lambda s: s.area())]

    def remove(self, name):
        for i, s in enumerate(self._shapes):
            if s.name() == name:
                del self._shapes[i]
                return True
        return False

    def __str__(self):
        return f"Canvas({len(self)} shapes, area={self.total_area():.2f})"
`,
    explanation: `**Abstraction.** \`Shape\` uses \`abc.ABC\` with abstract methods, so it cannot be instantiated and every subclass must supply the full interface. \`Canvas\` talks only to that interface: it works unchanged for any new \`Shape\` subclass (polymorphism).

**Invariants.** Constructors raise \`ValueError\` rather than building a broken object, and \`add\` raises \`TypeError\` for a wrong type, so the canvas list only ever contains valid shapes. \`Canvas\` *owns* its list (composition); \`largest\` and \`sorted_by_area\` use \`max\`/\`sorted\` with a key function instead of mutating it.

**Dunder methods.** \`__len__\` and \`__str__\` make the canvas behave like built-in containers, the Python counterpart of C++'s \`operator<<\`.`,
  },
  {
    id: 'mastery-e03', lang: 'cpp', title: 'Capstone: Bank System (C++)', difficulty: 3,
    task: `Build a bank with an account hierarchy, an exception hierarchy, safe transfers and listeners.

**Exceptions** (provided in the starter): \`BankError : std::runtime_error\`, \`InsufficientFunds : BankError\`, \`AccountNotFound : BankError\`.

**Accounts**
- \`Account(std::string owner, double initial = 0)\`: **protected** \`double balance_\`; \`const std::string& owner() const\`, \`double balance() const\`; \`void deposit(double)\` and \`virtual void withdraw(double)\`; virtual destructor. A non-positive amount throws \`std::invalid_argument\`. A plain account may not go below 0: otherwise \`withdraw\` throws \`InsufficientFunds\` and leaves the balance unchanged.
- \`SavingsAccount(owner, initial, double minBalance)\`: \`withdraw\` may not leave the balance below \`minBalance\` (\`InsufficientFunds\`). \`void addInterest(double rate)\` adds \`balance * rate\` (a negative rate throws \`std::invalid_argument\`).
- \`CheckingAccount(owner, initial, double overdraftLimit)\`: the balance may go down to \`-overdraftLimit\`, no further.

**Bank**
- \`int open(std::unique_ptr<Account>)\` takes ownership and returns a generated id from a **static counter** shared by all banks (ids start at 1 and increase by one per account). \`Account& get(int id)\` throws \`AccountNotFound\`.
- \`void deposit(int id, double)\`, \`void withdraw(int id, double)\`.
- \`void transfer(int from, int to, double amount)\` gives the **strong guarantee**: if anything fails (unknown account, insufficient funds, bad amount) no balance changes and no event is sent.
- \`using Listener = std::function<void(const std::string&)>\`, \`void addListener(Listener)\`. After each **successful** operation every listener receives \`"deposit <id>"\`, \`"withdraw <id>"\` or \`"transfer <from>-><to>"\` (a transfer sends only the transfer event). \`open\` sends nothing.`,
    starter: BANK_CPP_STARTER,
    tests: [
      { name: 'class and exception hierarchy', code: `EXPECT((std::is_base_of_v<std::runtime_error, BankError>));
EXPECT((std::is_base_of_v<BankError, InsufficientFunds>));
EXPECT((std::is_base_of_v<BankError, AccountNotFound>));
EXPECT((std::is_base_of_v<Account, SavingsAccount>));
EXPECT((std::is_base_of_v<Account, CheckingAccount>));
EXPECT((std::is_polymorphic_v<Account>));
EXPECT((std::has_virtual_destructor_v<Account>));` },
      { name: 'account basics', code: `Account a("ann", 100);
EXPECT_EQ(a.owner(), std::string("ann"));
a.deposit(50);
EXPECT_NEAR(a.balance(), 150.0, 1e-9);
a.withdraw(30);
EXPECT_NEAR(a.balance(), 120.0, 1e-9);
EXPECT_THROWS(a.withdraw(500), InsufficientFunds);
EXPECT_NEAR(a.balance(), 120.0, 1e-9);
EXPECT_THROWS(a.deposit(-1), std::invalid_argument);
EXPECT_THROWS(a.withdraw(0), std::invalid_argument);` },
      { name: 'savings and checking limits through the base class', code: `std::unique_ptr<Account> s = std::make_unique<SavingsAccount>("s", 500, 100);
EXPECT_THROWS(s->withdraw(450), InsufficientFunds);
s->withdraw(400);
EXPECT_NEAR(s->balance(), 100.0, 1e-9);
EXPECT_THROWS(s->withdraw(1), InsufficientFunds);
std::unique_ptr<Account> c = std::make_unique<CheckingAccount>("c", 50, 200);
c->withdraw(250);
EXPECT_NEAR(c->balance(), -200.0, 1e-9);
EXPECT_THROWS(c->withdraw(1), InsufficientFunds);
EXPECT_NEAR(c->balance(), -200.0, 1e-9);
SavingsAccount sv("t", 1000, 0);
sv.addInterest(0.1);
EXPECT_NEAR(sv.balance(), 1100.0, 1e-9);` },
      { name: 'bank ids, lookup and basic operations', code: `Bank b1, b2;
int a = b1.open(std::make_unique<Account>("ann", 100));
int c = b2.open(std::make_unique<CheckingAccount>("cy", 0, 50));
EXPECT_EQ(c, a + 1);
EXPECT_EQ(b1.get(a).owner(), std::string("ann"));
EXPECT_THROWS(b1.get(a + 1000), AccountNotFound);
b1.deposit(a, 25);
EXPECT_NEAR(b1.get(a).balance(), 125.0, 1e-9);
b1.withdraw(a, 25);
EXPECT_NEAR(b1.get(a).balance(), 100.0, 1e-9);
EXPECT_THROWS(b1.deposit(a + 1000, 5), AccountNotFound);` },
      { name: 'transfer works and gives the strong guarantee', code: `Bank bank;
int a = bank.open(std::make_unique<Account>("ann", 100));
int b = bank.open(std::make_unique<Account>("bob", 10));
bank.transfer(a, b, 40);
EXPECT_NEAR(bank.get(a).balance(), 60.0, 1e-9);
EXPECT_NEAR(bank.get(b).balance(), 50.0, 1e-9);
EXPECT_THROWS(bank.transfer(a, b, 1000), InsufficientFunds);
EXPECT_NEAR(bank.get(a).balance(), 60.0, 1e-9);
EXPECT_NEAR(bank.get(b).balance(), 50.0, 1e-9);
EXPECT_THROWS(bank.transfer(a, b + 1000, 10), AccountNotFound);
EXPECT_NEAR(bank.get(a).balance(), 60.0, 1e-9);
EXPECT_THROWS(bank.transfer(a, b, -5), std::invalid_argument);
EXPECT_NEAR(bank.get(a).balance(), 60.0, 1e-9);
EXPECT_NEAR(bank.get(b).balance(), 50.0, 1e-9);` },
      { name: 'listeners are notified only on success', code: `Bank bank;
std::vector<std::string> events;
bank.addListener([&](const std::string& e) { events.push_back(e); });
int a = bank.open(std::make_unique<Account>("ann", 100));
int b = bank.open(std::make_unique<Account>("bob", 0));
EXPECT(events.empty());
bank.deposit(a, 10);
bank.withdraw(a, 5);
bank.transfer(a, b, 20);
try { bank.withdraw(a, 99999); } catch (const BankError&) {}
try { bank.transfer(a, b, 99999); } catch (const BankError&) {}
std::vector<std::string> expected = {
    "deposit " + std::to_string(a),
    "withdraw " + std::to_string(a),
    "transfer " + std::to_string(a) + "->" + std::to_string(b)};
EXPECT((events == expected));
int second = 0;
bank.addListener([&](const std::string&) { ++second; });
bank.deposit(b, 1);
EXPECT_EQ(second, 1);
EXPECT_EQ(events.size(), std::size_t(4));` },
    ],
    hints: [
      'Give Account a protected virtual helper such as minAllowed() (0 for a plain account, minBalance for savings, -overdraft for checking) so the validation in withdraw() is written once.',
      'Bank keeps std::map<int, std::unique_ptr<Account>> and an inline static int next_id_ = 1. get() throws AccountNotFound when find() hits end().',
      'transfer: fetch both accounts first (they may throw), then src.withdraw(amount) (may throw, nothing changed yet), then dst.deposit(amount) (cannot fail once the amount is valid), and only then notify listeners.',
    ],
    solution: BANK_CPP_SOLUTION,
    explanation: `**Encapsulation and inheritance.** \`balance_\` is protected, so only the account classes can change it, and public methods enforce the rules. The "how low may the balance go" rule is the only thing that differs between account types, so it lives in one virtual hook (\`minAllowed\`) and \`withdraw\` stays a single piece of validated logic: a small Template Method. Polymorphism means \`Bank\` stores \`unique_ptr<Account>\` and never cares which kind it holds.

**Exceptions.** A specific hierarchy (\`BankError\` to \`InsufficientFunds\` / \`AccountNotFound\`) lets callers catch precisely, or catch every bank problem with one handler.

**Strong guarantee.** \`transfer\` looks up both accounts first, then performs the only operation that can fail (\`withdraw\`) before the one that cannot (\`deposit\`); if anything throws, nothing has changed and no listener was told. **Observer + static state.** Listeners are plain callables notified after success, and the \`static\` counter hands out unique ids across all banks.`,
  },
  {
    id: 'mastery-e04', lang: 'python', title: 'Capstone: Bank System (Python)', difficulty: 3,
    task: `Build the bank in Python.

**Exceptions** (provided in the starter): \`BankError(Exception)\`, \`InsufficientFunds(BankError)\`, \`AccountNotFound(BankError)\`.

**Accounts**
- \`Account(owner, initial=0)\`: the balance is stored in \`_balance\` and exposed through a **read-only** \`balance\` property (assigning to it raises \`AttributeError\`); \`owner\` property; \`deposit(amount)\` and \`withdraw(amount)\`. A non-positive amount raises \`ValueError\`. A plain account may not go below 0: otherwise \`withdraw\` raises \`InsufficientFunds\` and leaves the balance unchanged.
- \`SavingsAccount(owner, initial, min_balance)\`: \`withdraw\` may not leave the balance below \`min_balance\`. \`add_interest(rate)\` adds \`balance * rate\` (negative rate raises \`ValueError\`).
- \`CheckingAccount(owner, initial, overdraft_limit)\`: the balance may go down to \`-overdraft_limit\`.

**Bank**
- \`open(account)\` returns a generated id from a **class-level counter** shared by all banks (ids start at 1 and increase by one per account); \`get(id)\` raises \`AccountNotFound\`.
- \`deposit(id, amount)\`, \`withdraw(id, amount)\`.
- \`transfer(from_id, to_id, amount)\` gives the **strong guarantee**: if anything fails no balance changes and no event is sent.
- \`add_listener(fn)\`: after each **successful** operation every listener is called with \`"deposit <id>"\`, \`"withdraw <id>"\` or \`"transfer <from>-><to>"\` (a transfer sends only the transfer event). \`open\` sends nothing.`,
    starter: `class BankError(Exception):
    pass


class InsufficientFunds(BankError):
    pass


class AccountNotFound(BankError):
    pass


class Account:
    def __init__(self, owner, initial=0):
        raise NotImplementedError

    @property
    def owner(self):
        raise NotImplementedError

    @property
    def balance(self):
        raise NotImplementedError

    def deposit(self, amount):
        raise NotImplementedError

    def withdraw(self, amount):
        raise NotImplementedError


class SavingsAccount(Account):
    def __init__(self, owner, initial, min_balance):
        raise NotImplementedError

    def add_interest(self, rate):
        raise NotImplementedError


class CheckingAccount(Account):
    def __init__(self, owner, initial, overdraft_limit):
        raise NotImplementedError


class Bank:
    def __init__(self):
        raise NotImplementedError

    def open(self, account):
        raise NotImplementedError

    def get(self, account_id):
        raise NotImplementedError

    def deposit(self, account_id, amount):
        raise NotImplementedError

    def withdraw(self, account_id, amount):
        raise NotImplementedError

    def transfer(self, from_id, to_id, amount):
        raise NotImplementedError

    def add_listener(self, fn):
        raise NotImplementedError
`,
    tests: [
      { name: 'class and exception hierarchy', code: `assert issubclass(BankError, Exception)
assert issubclass(InsufficientFunds, BankError) and issubclass(AccountNotFound, BankError)
assert issubclass(SavingsAccount, Account) and issubclass(CheckingAccount, Account)` },
      { name: 'account basics and read-only balance', code: `def raises(exc, fn):
    try:
        fn()
    except exc:
        return True
    return False

a = Account("ann", 100)
assert a.owner == "ann"
a.deposit(50)
assert a.balance == 150
a.withdraw(30)
assert a.balance == 120
assert raises(InsufficientFunds, lambda: a.withdraw(500))
assert a.balance == 120
assert raises(ValueError, lambda: a.deposit(-1))
assert raises(ValueError, lambda: a.withdraw(0))
assert raises(AttributeError, lambda: setattr(a, "balance", 5)), "balance must be read-only"` },
      { name: 'savings and checking limits', code: `def raises(exc, fn):
    try:
        fn()
    except exc:
        return True
    return False

accounts = [SavingsAccount("s", 500, 100), CheckingAccount("c", 50, 200)]
s, c = accounts
assert raises(InsufficientFunds, lambda: s.withdraw(450))
s.withdraw(400)
assert s.balance == 100
assert raises(InsufficientFunds, lambda: s.withdraw(1))
c.withdraw(250)
assert c.balance == -200
assert raises(InsufficientFunds, lambda: c.withdraw(1))
assert c.balance == -200
sv = SavingsAccount("t", 1000, 0)
sv.add_interest(0.1)
assert abs(sv.balance - 1100) < 1e-9
assert raises(ValueError, lambda: sv.add_interest(-0.5))` },
      { name: 'bank ids, lookup and basic operations', code: `def raises(exc, fn):
    try:
        fn()
    except exc:
        return True
    return False

b1, b2 = Bank(), Bank()
a = b1.open(Account("ann", 100))
c = b2.open(CheckingAccount("cy", 0, 50))
assert c == a + 1, "ids come from a class-level counter shared by all banks"
assert b1.get(a).owner == "ann"
assert raises(AccountNotFound, lambda: b1.get(a + 1000))
b1.deposit(a, 25)
assert b1.get(a).balance == 125
b1.withdraw(a, 25)
assert b1.get(a).balance == 100
assert raises(AccountNotFound, lambda: b1.deposit(a + 1000, 5))` },
      { name: 'transfer works and gives the strong guarantee', code: `def raises(exc, fn):
    try:
        fn()
    except exc:
        return True
    return False

bank = Bank()
a = bank.open(Account("ann", 100))
b = bank.open(Account("bob", 10))
bank.transfer(a, b, 40)
assert bank.get(a).balance == 60 and bank.get(b).balance == 50
assert raises(InsufficientFunds, lambda: bank.transfer(a, b, 1000))
assert bank.get(a).balance == 60 and bank.get(b).balance == 50
assert raises(AccountNotFound, lambda: bank.transfer(a, b + 1000, 10))
assert bank.get(a).balance == 60
assert raises(ValueError, lambda: bank.transfer(a, b, -5))
assert bank.get(a).balance == 60 and bank.get(b).balance == 50` },
      { name: 'listeners are notified only on success', code: `bank = Bank()
events = []
bank.add_listener(events.append)
a = bank.open(Account("ann", 100))
b = bank.open(Account("bob", 0))
assert events == []
bank.deposit(a, 10)
bank.withdraw(a, 5)
bank.transfer(a, b, 20)
for op in (lambda: bank.withdraw(a, 99999), lambda: bank.transfer(a, b, 99999)):
    try:
        op()
    except BankError:
        pass
assert events == [f"deposit {a}", f"withdraw {a}", f"transfer {a}->{b}"], events
second = []
bank.add_listener(second.append)
bank.deposit(b, 1)
assert second == [f"deposit {b}"] and len(events) == 4` },
    ],
    hints: [
      'Store the balance in self._balance and expose it with @property without a setter. Give Account a method such as _min_allowed() (0 for plain, min_balance for savings, -overdraft for checking) so withdraw() is written once.',
      'Bank keeps self._accounts = {} and a class attribute _next_id = 1; open() reads and increments Bank._next_id (not self._next_id) so it is shared by all banks.',
      'transfer: src = self.get(from_id); dst = self.get(to_id); src.withdraw(amount) (may raise, nothing changed yet); dst.deposit(amount); then notify listeners.',
    ],
    solution: `class BankError(Exception):
    pass


class InsufficientFunds(BankError):
    pass


class AccountNotFound(BankError):
    pass


class Account:
    def __init__(self, owner, initial=0):
        self._owner = owner
        self._balance = initial

    @property
    def owner(self):
        return self._owner

    @property
    def balance(self):
        return self._balance

    def _min_allowed(self):
        return 0

    def deposit(self, amount):
        if amount <= 0:
            raise ValueError("amount must be positive")
        self._balance += amount

    def withdraw(self, amount):
        if amount <= 0:
            raise ValueError("amount must be positive")
        if self._balance - amount < self._min_allowed():
            raise InsufficientFunds("insufficient funds")
        self._balance -= amount


class SavingsAccount(Account):
    def __init__(self, owner, initial, min_balance):
        super().__init__(owner, initial)
        self._min_balance = min_balance

    def _min_allowed(self):
        return self._min_balance

    def add_interest(self, rate):
        if rate < 0:
            raise ValueError("rate must not be negative")
        self._balance += self._balance * rate


class CheckingAccount(Account):
    def __init__(self, owner, initial, overdraft_limit):
        super().__init__(owner, initial)
        self._overdraft = overdraft_limit

    def _min_allowed(self):
        return -self._overdraft


class Bank:
    _next_id = 1

    def __init__(self):
        self._accounts = {}
        self._listeners = []

    def open(self, account):
        account_id = Bank._next_id
        Bank._next_id += 1
        self._accounts[account_id] = account
        return account_id

    def get(self, account_id):
        try:
            return self._accounts[account_id]
        except KeyError:
            raise AccountNotFound(f"account not found: {account_id}") from None

    def _notify(self, event):
        for fn in self._listeners:
            fn(event)

    def deposit(self, account_id, amount):
        self.get(account_id).deposit(amount)
        self._notify(f"deposit {account_id}")

    def withdraw(self, account_id, amount):
        self.get(account_id).withdraw(amount)
        self._notify(f"withdraw {account_id}")

    def transfer(self, from_id, to_id, amount):
        src = self.get(from_id)
        dst = self.get(to_id)
        src.withdraw(amount)   # may raise: nothing has changed yet
        dst.deposit(amount)    # cannot fail: amount was validated by withdraw
        self._notify(f"transfer {from_id}->{to_id}")

    def add_listener(self, fn):
        self._listeners.append(fn)
`,
    explanation: `**Encapsulation.** The balance lives in \`_balance\` and is exposed only through a read-only property, so every change goes through \`deposit\`/\`withdraw\`, where the rules are enforced. The only thing that differs between account types is how low the balance may go, so it is a single overridable hook (\`_min_allowed\`) and \`withdraw\` stays one validated routine: a small Template Method, with polymorphism letting \`Bank\` treat all accounts alike.

**Exceptions.** A specific hierarchy lets callers catch \`InsufficientFunds\` precisely or any \`BankError\` generally; \`raise ... from None\` hides the irrelevant \`KeyError\`.

**Strong guarantee and class state.** \`transfer\` looks up both accounts, then does the one step that can fail (\`withdraw\`) before the step that cannot (\`deposit\`), so a failure leaves everything untouched and silent. The id counter is a **class attribute** (\`Bank._next_id\`), shared by every bank. Listeners are plain callables: the Observer pattern with no ceremony.`,
  },
  {
    id: 'mastery-e05', lang: 'cpp', title: 'Capstone: Library Events (C++)', difficulty: 3,
    task: `Build a library that combines **Strategy** (late fees), **Command** (checkout/return with undo) and **Observer** (reservation alerts). All errors below are \`std::runtime_error\`.

**Strategy**: \`FeePolicy\` (abstract, virtual destructor, \`virtual double fee(int daysLate) const = 0\`). \`StandardFee\` charges 1.00 per late day, \`StudentFee\` 0.50, \`SeniorFee\` 0.25; zero or negative \`daysLate\` costs 0.

**Command**: \`Command\` (abstract, virtual destructor, \`execute()\`, \`undo()\`); \`CheckoutCommand(Library&, std::string member, int bookId)\`; \`ReturnCommand(Library&, std::string member, int bookId, int daysLate)\`. Their \`undo()\` reverses the effect (a return's undo puts the book back on loan to that member and removes the fee it added).

**Library**
- \`addBook(int id, const std::string& title)\` (duplicate id throws); \`addMember(const std::string& name, std::unique_ptr<FeePolicy> policy)\`.
- \`checkOut(member, bookId)\`: unknown member/book, or a book already on loan, throws. \`double giveBack(member, bookId, daysLate)\`: the book must be on loan to that member (else throws); adds \`policy->fee(daysLate)\` to the member's fees, makes the book available, returns the fee. Then, if members are waiting for the book, the **first** waiting member is removed from the queue and every listener is called with \`(member, bookId)\`.
- \`undoCheckOut(int bookId)\` makes the book available; \`undoGiveBack(member, bookId, fee)\` puts it back on loan to \`member\` and subtracts \`fee\`.
- \`reserve(member, bookId)\`: queues the member; throws if the book is currently available.
- \`using Listener = std::function<void(const std::string& member, int bookId)>\`; \`subscribe(Listener)\`. \`double feesOwed(member) const\` (unknown member throws).
- \`std::string report() const\`: one line per book **ordered by id**, each ending in \`"\\n"\`: \`"<id> <title> - available"\` or \`"<id> <title> - on loan to <member>"\`.
- \`run(std::unique_ptr<Command>)\` executes the command and records it (if \`execute\` throws, nothing is recorded); \`bool undoLast()\` undoes the most recent recorded command, returning \`false\` if there is none.`,
    starter: LIB_CPP_STARTER,
    tests: [
      { name: 'fee strategies', code: `EXPECT((std::is_abstract_v<FeePolicy>));
EXPECT((std::is_base_of_v<FeePolicy, StandardFee>));
EXPECT((std::is_base_of_v<FeePolicy, StudentFee>));
EXPECT((std::is_base_of_v<FeePolicy, SeniorFee>));
EXPECT_NEAR(StandardFee().fee(3), 3.0, 1e-9);
EXPECT_NEAR(StudentFee().fee(3), 1.5, 1e-9);
EXPECT_NEAR(SeniorFee().fee(4), 1.0, 1e-9);
EXPECT_NEAR(StandardFee().fee(0), 0.0, 1e-9);
EXPECT_NEAR(StudentFee().fee(-2), 0.0, 1e-9);` },
      { name: 'checkout, errors and stable report', code: `Library lib;
lib.addBook(2, "Emma");
lib.addBook(1, "Dune");
lib.addMember("ann", std::make_unique<StandardFee>());
EXPECT_EQ(lib.report(), std::string("1 Dune - available\\n2 Emma - available\\n"));
lib.checkOut("ann", 2);
EXPECT_EQ(lib.report(), std::string("1 Dune - available\\n2 Emma - on loan to ann\\n"));
EXPECT_THROWS(lib.checkOut("ann", 2), std::runtime_error);
EXPECT_THROWS(lib.checkOut("ann", 99), std::runtime_error);
EXPECT_THROWS(lib.checkOut("zed", 1), std::runtime_error);
EXPECT_THROWS(lib.addBook(1, "Again"), std::runtime_error);` },
      { name: 'return charges the member policy fee', code: `Library lib;
lib.addBook(1, "Dune");
lib.addBook(2, "Emma");
lib.addMember("stu", std::make_unique<StudentFee>());
lib.addMember("sen", std::make_unique<SeniorFee>());
lib.checkOut("stu", 1);
lib.checkOut("sen", 2);
EXPECT_NEAR(lib.giveBack("stu", 1, 4), 2.0, 1e-9);
EXPECT_NEAR(lib.feesOwed("stu"), 2.0, 1e-9);
EXPECT_NEAR(lib.giveBack("sen", 2, 4), 1.0, 1e-9);
EXPECT_NEAR(lib.feesOwed("sen"), 1.0, 1e-9);
EXPECT_EQ(lib.report(), std::string("1 Dune - available\\n2 Emma - available\\n"));
EXPECT_THROWS(lib.giveBack("stu", 1, 0), std::runtime_error);
EXPECT_THROWS(lib.feesOwed("nobody"), std::runtime_error);` },
      { name: 'commands and undo', code: `Library lib;
lib.addBook(1, "Dune");
lib.addMember("ann", std::make_unique<StandardFee>());
EXPECT((std::is_abstract_v<Command>));
EXPECT((std::is_base_of_v<Command, CheckoutCommand>));
EXPECT((std::is_base_of_v<Command, ReturnCommand>));
lib.run(std::make_unique<CheckoutCommand>(lib, "ann", 1));
EXPECT_EQ(lib.report(), std::string("1 Dune - on loan to ann\\n"));
lib.run(std::make_unique<ReturnCommand>(lib, "ann", 1, 3));
EXPECT_NEAR(lib.feesOwed("ann"), 3.0, 1e-9);
EXPECT_EQ(lib.report(), std::string("1 Dune - available\\n"));
EXPECT(lib.undoLast());
EXPECT_NEAR(lib.feesOwed("ann"), 0.0, 1e-9);
EXPECT_EQ(lib.report(), std::string("1 Dune - on loan to ann\\n"));
EXPECT(lib.undoLast());
EXPECT_EQ(lib.report(), std::string("1 Dune - available\\n"));
EXPECT(!lib.undoLast());` },
      { name: 'failed commands are not recorded', code: `Library lib;
lib.addBook(1, "Dune");
lib.addMember("ann", std::make_unique<StandardFee>());
EXPECT_THROWS(lib.run(std::make_unique<CheckoutCommand>(lib, "ann", 42)), std::runtime_error);
EXPECT(!lib.undoLast());
EXPECT_THROWS(lib.run(std::make_unique<ReturnCommand>(lib, "ann", 1, 0)), std::runtime_error);
EXPECT(!lib.undoLast());
EXPECT_EQ(lib.report(), std::string("1 Dune - available\\n"));` },
      { name: 'reservations notify the first waiting member', code: `Library lib;
lib.addBook(1, "Dune");
lib.addMember("ann", std::make_unique<StandardFee>());
lib.addMember("bob", std::make_unique<StudentFee>());
lib.addMember("cy", std::make_unique<SeniorFee>());
EXPECT_THROWS(lib.reserve("bob", 1), std::runtime_error);
std::vector<std::pair<std::string, int>> got;
lib.subscribe([&](const std::string& m, int id) { got.push_back({m, id}); });
lib.checkOut("ann", 1);
lib.reserve("bob", 1);
lib.reserve("cy", 1);
lib.giveBack("ann", 1, 0);
EXPECT_EQ(got.size(), std::size_t(1));
EXPECT_EQ(got[0].first, std::string("bob"));
EXPECT_EQ(got[0].second, 1);
lib.checkOut("bob", 1);
lib.giveBack("bob", 1, 0);
EXPECT_EQ(got.size(), std::size_t(2));
EXPECT_EQ(got[1].first, std::string("cy"));
lib.checkOut("cy", 1);
lib.giveBack("cy", 1, 0);
EXPECT_EQ(got.size(), std::size_t(2));` },
    ],
    hints: [
      'Keep per-book state in a struct (title, borrower, std::deque<std::string> waiting) inside std::map<int, Book>: iterating a map gives the report in id order for free. Members live in std::map<std::string, std::unique_ptr<FeePolicy>> plus a fee total per member.',
      'The commands are thin: CheckoutCommand::execute calls lib.checkOut and undo calls lib.undoCheckOut; ReturnCommand::execute stores the fee returned by lib.giveBack so undo can pass it to lib.undoGiveBack.',
      'run(): c->execute() first (so a throw records nothing), then push into a vector<unique_ptr<Command>>. undoLast(): return false if empty, else history_.back()->undo() and pop_back(). In giveBack(), pop the front of the waiting deque and call every listener after the book becomes available.',
    ],
    solution: LIB_CPP_SOLUTION,
    explanation: `**Strategy.** Late fees are a family of interchangeable algorithms behind \`FeePolicy\`; each member carries its own policy, so \`giveBack\` has no \`if (student) ... else if (senior)\` chain, and a new member type is a new class (open/closed, dependency inversion).

**Command.** Checkout and return are objects with \`execute\`/\`undo\`, so \`Library::run\` can record them and \`undoLast\` can reverse them. Because \`run\` executes before recording, a failing command leaves no trace. \`ReturnCommand\` stores the fee computed at execution time so its \`undo\` can remove exactly that amount.

**Observer and composition.** Reservations queue per book; when a book comes back, the first waiting member is dequeued and listeners are told, with no knowledge of who listens. \`Library\` owns members, policies and history via \`unique_ptr\`, and \`std::map\` keeps the report in a stable order.`,
  },
  {
    id: 'mastery-e06', lang: 'python', title: 'Capstone: Library Events (Python)', difficulty: 3,
    task: `Build the library in Python, combining **Strategy** (late fees), **Command** (checkout/return with undo) and **Observer** (reservation alerts). Every error below is \`LibraryError\`, which the starter defines as a subclass of \`Exception\`.

**Strategy**: \`FeePolicy\` (an \`abc.ABC\` with abstract \`fee(self, days_late)\`). \`StandardFee\` charges 1.00 per late day, \`StudentFee\` 0.50, \`SeniorFee\` 0.25; zero or negative \`days_late\` costs 0.

**Command**: \`Command\` (an \`abc.ABC\` with abstract \`execute()\` and \`undo()\`); \`CheckoutCommand(library, member, book_id)\`; \`ReturnCommand(library, member, book_id, days_late)\`. Their \`undo()\` reverses the effect (a return's undo puts the book back on loan to that member and removes the fee it added).

**Library**
- \`add_book(book_id, title)\` (duplicate id raises); \`add_member(name, policy)\`.
- \`check_out(member, book_id)\`: unknown member/book, or a book already on loan, raises. \`give_back(member, book_id, days_late)\`: the book must be on loan to that member (else raises); adds \`policy.fee(days_late)\` to the member's fees, makes the book available, returns the fee. Then, if members are waiting for the book, the **first** waiting member is removed from the queue and every listener is called with \`(member, book_id)\`.
- \`undo_check_out(book_id)\` makes the book available; \`undo_give_back(member, book_id, fee)\` puts it back on loan to \`member\` and subtracts \`fee\`.
- \`reserve(member, book_id)\`: queues the member; raises if the book is currently available.
- \`subscribe(listener)\` where a listener is a callable taking \`(member, book_id)\`. \`fees_owed(member)\` (unknown member raises).
- \`report()\`: one line per book **ordered by id**, each ending in \`"\\n"\`: \`"<id> <title> - available"\` or \`"<id> <title> - on loan to <member>"\`.
- \`run(command)\` executes the command and records it (if \`execute\` raises, nothing is recorded); \`undo_last()\` undoes the most recent recorded command and returns \`True\`, or returns \`False\` if there is none.`,
    starter: `from abc import ABC, abstractmethod


class LibraryError(Exception):
    pass


class FeePolicy(ABC):
    @abstractmethod
    def fee(self, days_late):
        ...


class StandardFee(FeePolicy):
    def fee(self, days_late):
        raise NotImplementedError


class StudentFee(FeePolicy):
    def fee(self, days_late):
        raise NotImplementedError


class SeniorFee(FeePolicy):
    def fee(self, days_late):
        raise NotImplementedError


class Command(ABC):
    @abstractmethod
    def execute(self):
        ...

    @abstractmethod
    def undo(self):
        ...


class Library:
    def __init__(self):
        raise NotImplementedError

    def add_book(self, book_id, title):
        raise NotImplementedError

    def add_member(self, name, policy):
        raise NotImplementedError

    def check_out(self, member, book_id):
        raise NotImplementedError

    def give_back(self, member, book_id, days_late):
        raise NotImplementedError

    def undo_check_out(self, book_id):
        raise NotImplementedError

    def undo_give_back(self, member, book_id, fee):
        raise NotImplementedError

    def reserve(self, member, book_id):
        raise NotImplementedError

    def subscribe(self, listener):
        raise NotImplementedError

    def fees_owed(self, member):
        raise NotImplementedError

    def report(self):
        raise NotImplementedError

    def run(self, command):
        raise NotImplementedError

    def undo_last(self):
        raise NotImplementedError


class CheckoutCommand(Command):
    def __init__(self, library, member, book_id):
        raise NotImplementedError

    def execute(self):
        raise NotImplementedError

    def undo(self):
        raise NotImplementedError


class ReturnCommand(Command):
    def __init__(self, library, member, book_id, days_late):
        raise NotImplementedError

    def execute(self):
        raise NotImplementedError

    def undo(self):
        raise NotImplementedError
`,
    tests: [
      { name: 'fee strategies', code: `assert issubclass(StandardFee, FeePolicy) and issubclass(StudentFee, FeePolicy) and issubclass(SeniorFee, FeePolicy)
assert StandardFee().fee(3) == 3.0
assert StudentFee().fee(3) == 1.5
assert SeniorFee().fee(4) == 1.0
assert StandardFee().fee(0) == 0 and StudentFee().fee(-2) == 0` },
      { name: 'checkout, errors and stable report', code: `def raises(exc, fn):
    try:
        fn()
    except exc:
        return True
    return False

lib = Library()
lib.add_book(2, "Emma")
lib.add_book(1, "Dune")
lib.add_member("ann", StandardFee())
assert lib.report() == "1 Dune - available\\n2 Emma - available\\n", repr(lib.report())
lib.check_out("ann", 2)
assert lib.report() == "1 Dune - available\\n2 Emma - on loan to ann\\n", repr(lib.report())
assert raises(LibraryError, lambda: lib.check_out("ann", 2))
assert raises(LibraryError, lambda: lib.check_out("ann", 99))
assert raises(LibraryError, lambda: lib.check_out("zed", 1))
assert raises(LibraryError, lambda: lib.add_book(1, "Again"))` },
      { name: 'return charges the member policy fee', code: `def raises(exc, fn):
    try:
        fn()
    except exc:
        return True
    return False

lib = Library()
lib.add_book(1, "Dune")
lib.add_book(2, "Emma")
lib.add_member("stu", StudentFee())
lib.add_member("sen", SeniorFee())
lib.check_out("stu", 1)
lib.check_out("sen", 2)
assert lib.give_back("stu", 1, 4) == 2.0
assert lib.fees_owed("stu") == 2.0
assert lib.give_back("sen", 2, 4) == 1.0
assert lib.fees_owed("sen") == 1.0
assert lib.report() == "1 Dune - available\\n2 Emma - available\\n"
assert raises(LibraryError, lambda: lib.give_back("stu", 1, 0))
assert raises(LibraryError, lambda: lib.fees_owed("nobody"))` },
      { name: 'commands and undo', code: `lib = Library()
lib.add_book(1, "Dune")
lib.add_member("ann", StandardFee())
assert issubclass(CheckoutCommand, Command) and issubclass(ReturnCommand, Command)
lib.run(CheckoutCommand(lib, "ann", 1))
assert lib.report() == "1 Dune - on loan to ann\\n"
lib.run(ReturnCommand(lib, "ann", 1, 3))
assert lib.fees_owed("ann") == 3.0
assert lib.report() == "1 Dune - available\\n"
assert lib.undo_last() is True
assert lib.fees_owed("ann") == 0
assert lib.report() == "1 Dune - on loan to ann\\n"
assert lib.undo_last() is True
assert lib.report() == "1 Dune - available\\n"
assert lib.undo_last() is False` },
      { name: 'failed commands are not recorded', code: `def raises(exc, fn):
    try:
        fn()
    except exc:
        return True
    return False

lib = Library()
lib.add_book(1, "Dune")
lib.add_member("ann", StandardFee())
assert raises(LibraryError, lambda: lib.run(CheckoutCommand(lib, "ann", 42)))
assert lib.undo_last() is False
assert raises(LibraryError, lambda: lib.run(ReturnCommand(lib, "ann", 1, 0)))
assert lib.undo_last() is False
assert lib.report() == "1 Dune - available\\n"` },
      { name: 'reservations notify the first waiting member', code: `def raises(exc, fn):
    try:
        fn()
    except exc:
        return True
    return False

lib = Library()
lib.add_book(1, "Dune")
lib.add_member("ann", StandardFee())
lib.add_member("bob", StudentFee())
lib.add_member("cy", SeniorFee())
assert raises(LibraryError, lambda: lib.reserve("bob", 1))
got = []
lib.subscribe(lambda member, book_id: got.append((member, book_id)))
lib.check_out("ann", 1)
lib.reserve("bob", 1)
lib.reserve("cy", 1)
lib.give_back("ann", 1, 0)
assert got == [("bob", 1)], got
lib.check_out("bob", 1)
lib.give_back("bob", 1, 0)
assert got == [("bob", 1), ("cy", 1)], got
lib.check_out("cy", 1)
lib.give_back("cy", 1, 0)
assert len(got) == 2` },
    ],
    hints: [
      'Keep books in a dict of small records (title, borrower, a collections.deque of waiting members) and build report() from sorted(self._books). Members map to their FeePolicy; fees map to running totals.',
      'The commands are thin: CheckoutCommand.execute calls library.check_out and undo calls library.undo_check_out; ReturnCommand.execute stores the fee returned by library.give_back so undo can pass it to library.undo_give_back.',
      'run(): command.execute() first (so an exception records nothing), then self._history.append(command). undo_last(): return False if empty, else self._history.pop().undo() and return True. In give_back(), popleft() the waiting deque and call every listener after the book is available.',
    ],
    solution: `from abc import ABC, abstractmethod
from collections import deque


class LibraryError(Exception):
    pass


class FeePolicy(ABC):
    @abstractmethod
    def fee(self, days_late):
        ...


class StandardFee(FeePolicy):
    def fee(self, days_late):
        return days_late * 1.00 if days_late > 0 else 0.0


class StudentFee(FeePolicy):
    def fee(self, days_late):
        return days_late * 0.50 if days_late > 0 else 0.0


class SeniorFee(FeePolicy):
    def fee(self, days_late):
        return days_late * 0.25 if days_late > 0 else 0.0


class Command(ABC):
    @abstractmethod
    def execute(self):
        ...

    @abstractmethod
    def undo(self):
        ...


class Library:
    def __init__(self):
        self._books = {}      # id -> {"title", "borrower", "waiting"}
        self._members = {}    # name -> FeePolicy
        self._fees = {}       # name -> total
        self._listeners = []
        self._history = []

    def _book(self, book_id):
        try:
            return self._books[book_id]
        except KeyError:
            raise LibraryError(f"no such book: {book_id}") from None

    def _require_member(self, name):
        if name not in self._members:
            raise LibraryError(f"no such member: {name}")

    def add_book(self, book_id, title):
        if book_id in self._books:
            raise LibraryError("duplicate book id")
        self._books[book_id] = {"title": title, "borrower": None, "waiting": deque()}

    def add_member(self, name, policy):
        self._members[name] = policy
        self._fees.setdefault(name, 0.0)

    def check_out(self, member, book_id):
        self._require_member(member)
        book = self._book(book_id)
        if book["borrower"] is not None:
            raise LibraryError("book already on loan")
        book["borrower"] = member

    def give_back(self, member, book_id, days_late):
        self._require_member(member)
        book = self._book(book_id)
        if book["borrower"] != member:
            raise LibraryError("book is not on loan to this member")
        fee = self._members[member].fee(days_late)
        self._fees[member] += fee
        book["borrower"] = None
        if book["waiting"]:
            nxt = book["waiting"].popleft()
            for listener in self._listeners:
                listener(nxt, book_id)
        return fee

    def undo_check_out(self, book_id):
        self._book(book_id)["borrower"] = None

    def undo_give_back(self, member, book_id, fee):
        self._book(book_id)["borrower"] = member
        self._fees[member] -= fee

    def reserve(self, member, book_id):
        self._require_member(member)
        book = self._book(book_id)
        if book["borrower"] is None:
            raise LibraryError("book is available; no need to reserve")
        book["waiting"].append(member)

    def subscribe(self, listener):
        self._listeners.append(listener)

    def fees_owed(self, member):
        if member not in self._fees:
            raise LibraryError(f"no such member: {member}")
        return self._fees[member]

    def report(self):
        lines = []
        for book_id in sorted(self._books):
            b = self._books[book_id]
            status = "available" if b["borrower"] is None else "on loan to " + b["borrower"]
            lines.append(f"{book_id} {b['title']} - {status}\\n")
        return "".join(lines)

    def run(self, command):
        command.execute()
        self._history.append(command)

    def undo_last(self):
        if not self._history:
            return False
        self._history.pop().undo()
        return True


class CheckoutCommand(Command):
    def __init__(self, library, member, book_id):
        self._lib, self._member, self._book_id = library, member, book_id

    def execute(self):
        self._lib.check_out(self._member, self._book_id)

    def undo(self):
        self._lib.undo_check_out(self._book_id)


class ReturnCommand(Command):
    def __init__(self, library, member, book_id, days_late):
        self._lib, self._member, self._book_id = library, member, book_id
        self._days_late = days_late
        self._fee = 0.0

    def execute(self):
        self._fee = self._lib.give_back(self._member, self._book_id, self._days_late)

    def undo(self):
        self._lib.undo_give_back(self._member, self._book_id, self._fee)
`,
    explanation: `**Strategy.** Each member has a \`FeePolicy\`, so \`give_back\` simply asks \`policy.fee(days_late)\`; there is no chain of \`if member_type == ...\`, and a new kind of member is a new class (open/closed principle).

**Command.** Checkout and return are objects with \`execute\`/\`undo\`. \`run\` executes first and records only on success, so a failing command leaves no trace; \`ReturnCommand\` remembers the fee it charged so \`undo\` can take back exactly that amount. A stack of commands is all an undo feature needs.

**Observer and design.** Per-book waiting queues (\`deque\`) give first-come-first-served reservations, and listeners are plain callables the library invokes without knowing who they are. Dependencies (policies) are injected, errors form one specific type (\`LibraryError\`), and \`report()\` sorts by id so the output is stable.`,
  },
];
