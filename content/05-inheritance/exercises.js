export default [
  {
    id: 'inheritance-e01', lang: 'cpp', title: 'Animal → Dog', difficulty: 1,
    task: `Model a tiny animal hierarchy.

- \`class Animal\`
  - \`explicit Animal(std::string name)\`
  - \`std::string name() const\` returns the name.
  - \`std::string describe() const\` returns \`"<name> is an animal"\`.
- \`class Dog : public Animal\`
  - \`Dog(std::string name, std::string breed)\` passes the name to \`Animal\`'s constructor.
  - \`std::string breed() const\` returns the breed.
  - \`std::string describe() const\` returns \`Animal::describe()\` followed by \`" (a <breed> dog)"\`.

Keep the name **inside \`Animal\`** as a private member, and do not redeclare \`name()\` in \`Dog\`: it should be inherited.

~~~cpp
Dog rex("Rex", "beagle");
rex.name();             // "Rex"  (inherited from Animal)
rex.describe();         // "Rex is an animal (a beagle dog)"
const Animal& a = rex;  // a Dog is an Animal
~~~`,
    starter: `#include <string>
#include <utility>

class Animal {
public:
    explicit Animal(std::string name) {
        // TODO: store the name in a private data member
    }

    std::string name() const {
        return "";  // TODO
    }

    std::string describe() const {
        return "";  // TODO: "<name> is an animal"
    }
};

class Dog : public Animal {
public:
    // TODO: pass the real name to Animal's constructor and store the breed
    Dog(std::string name, std::string breed) : Animal("") {}

    std::string breed() const {
        return "";  // TODO
    }

    std::string describe() const {
        return "";  // TODO: reuse Animal::describe() and append " (a <breed> dog)"
    }
};
`,
    tests: [
      { name: 'Dog publicly inherits from Animal', code: `EXPECT((std::is_base_of_v<Animal, Dog>));
EXPECT((std::is_convertible_v<Dog*, Animal*>));` },
      { name: 'Animal works on its own', code: `Animal a("Tom");
EXPECT_EQ(a.name(), std::string("Tom"));
EXPECT_EQ(a.describe(), std::string("Tom is an animal"));` },
      { name: 'Dog stores its breed', code: `Dog d("Rex", "beagle");
EXPECT_EQ(d.breed(), std::string("beagle"));` },
      { name: 'name() is inherited, not redeclared', code: `Dog d("Rex", "beagle");
EXPECT_EQ(d.name(), std::string("Rex"));
EXPECT((std::is_same_v<decltype(&Dog::name), std::string (Animal::*)() const>));` },
      { name: 'Dog::describe extends Animal::describe', code: `EXPECT_EQ(Dog("Rex", "beagle").describe(), std::string("Rex is an animal (a beagle dog)"));
EXPECT_EQ(Dog("Bella", "collie").describe(), std::string("Bella is an animal (a collie dog)"));` },
      { name: 'a Dog can be used as an Animal', code: `Dog d("Bella", "collie");
const Animal& a = d;
EXPECT_EQ(a.name(), std::string("Bella"));` },
    ],
    hints: [
      'Give `Animal` a private `std::string name_;` and set it in the member-initializer list: `explicit Animal(std::string name) : name_(std::move(name)) {}`.',
      "`Dog`'s constructor must pass the name up: `: Animal(std::move(name)), breed_(std::move(breed))`. `Dog` does not need its own `name()`; it inherits `Animal::name()`.",
      '`Dog::describe()` can reuse the base version: `return Animal::describe() + " (a " + breed_ + " dog)";`. The `Animal::` qualifier stops it from calling itself.',
    ],
    solution: `#include <string>
#include <utility>

class Animal {
public:
    explicit Animal(std::string name) : name_(std::move(name)) {}

    std::string name() const { return name_; }

    std::string describe() const { return name_ + " is an animal"; }

private:
    std::string name_;
};

class Dog : public Animal {
public:
    Dog(std::string name, std::string breed)
        : Animal(std::move(name)), breed_(std::move(breed)) {}

    std::string breed() const { return breed_; }

    std::string describe() const {
        return Animal::describe() + " (a " + breed_ + " dog)";
    }

private:
    std::string breed_;
};
`,
    explanation: `**Constructor chaining.** \`Dog\`'s constructor hands the name to \`Animal\` in the member-initializer list: \`: Animal(std::move(name)), breed_(std::move(breed))\`. The base subobject is built first, then \`breed_\`, then the (empty) body. Because \`Animal\` has no default constructor, leaving out \`Animal(...)\` would not compile.

**Encapsulation survives inheritance.** \`name_\` stays \`private\` in \`Animal\`. \`Dog\` cannot touch it directly, and does not need to: it inherits the public \`name()\` and can call \`Animal::describe()\`. Each class guards its own data.

**Extend, don't copy.** \`Dog::describe()\` calls the base version with a *qualified* name and appends to it, so the "is an animal" wording lives in one place. An unqualified \`describe()\` would call \`Dog::describe\` itself and recurse forever.

One thing to notice: \`describe\` is not \`virtual\`, so with \`const Animal& a = rex;\` the call \`a.describe()\` runs \`Animal::describe\` and returns \`"Rex is an animal"\`. Module 06 shows how \`virtual\` changes that.`,
  },
  {
    id: 'inheritance-e02', lang: 'cpp', title: 'Savings account', difficulty: 2,
    task: `Build a bank account and a savings account that **reuses** it.

- \`class Account\`
  - \`protected: double balance_;\`
  - \`explicit Account(double initial)\` starts the balance at \`initial\`.
  - \`void deposit(double amount)\` adds \`amount\`.
  - \`bool withdraw(double amount)\`: if \`amount\` is greater than the balance, return \`false\` and change nothing; otherwise subtract it and return \`true\`.
  - \`double balance() const\`.
- \`class SavingsAccount : public Account\`
  - \`SavingsAccount(double initial, double rate, double minimum)\`.
  - \`void addInterest()\`: balance += balance × rate.
  - \`bool withdraw(double amount)\`: return \`false\` (changing nothing) if the balance would fall **below** \`minimum\`, i.e. \`balance - amount < minimum\`; otherwise delegate to \`Account::withdraw\`.

Assume all amounts are non-negative.

~~~cpp
SavingsAccount s(100, 0.05, 20);
s.withdraw(90);   // false: 10 would be below the minimum of 20
s.withdraw(80);   // true: exactly 20 is left
s.addInterest();  // balance is now 21
s.deposit(4);     // inherited from Account: balance is 25
~~~`,
    starter: `class Account {
public:
    explicit Account(double initial) : balance_(0) {}  // TODO: start at initial

    void deposit(double amount) {
        // TODO
    }

    bool withdraw(double amount) {
        return false;  // TODO
    }

    double balance() const {
        return 0;  // TODO
    }

protected:
    double balance_;
};

class SavingsAccount : public Account {
public:
    // TODO: forward initial to Account and store rate and minimum
    SavingsAccount(double initial, double rate, double minimum) : Account(0) {}

    void addInterest() {
        // TODO
    }

    bool withdraw(double amount) {
        return false;  // TODO: enforce the minimum, then reuse Account::withdraw
    }
};
`,
    tests: [
      { name: 'SavingsAccount is an Account', code: `EXPECT((std::is_base_of_v<Account, SavingsAccount>));
EXPECT((std::is_convertible_v<SavingsAccount*, Account*>));
EXPECT((!std::is_convertible_v<double, Account>));` },
      { name: 'Account deposit and withdraw', code: `Account a(100);
a.deposit(50);
EXPECT_NEAR(a.balance(), 150, 1e-9);
EXPECT(a.withdraw(30));
EXPECT_NEAR(a.balance(), 120, 1e-9);` },
      { name: 'Account rejects an overdraft', code: `Account a(100);
EXPECT(!a.withdraw(150));
EXPECT_NEAR(a.balance(), 100, 1e-9);
EXPECT(a.withdraw(100));
EXPECT_NEAR(a.balance(), 0, 1e-9);` },
      { name: 'SavingsAccount keeps the minimum', code: `SavingsAccount s(100, 0.05, 20);
EXPECT(!s.withdraw(90));
EXPECT_NEAR(s.balance(), 100, 1e-9);
EXPECT(s.withdraw(80));
EXPECT_NEAR(s.balance(), 20, 1e-9);` },
      { name: 'addInterest and inherited deposit', code: `SavingsAccount s(200, 0.05, 0);
s.addInterest();
EXPECT_NEAR(s.balance(), 210, 1e-9);
s.deposit(40);
EXPECT_NEAR(s.balance(), 250, 1e-9);` },
      { name: 'base withdraw still rejects overdrafts', code: `SavingsAccount s(100, 0.0, 0);
Account& base = s;
EXPECT(!base.withdraw(150));
EXPECT(!s.withdraw(150));
EXPECT_NEAR(s.balance(), 100, 1e-9);` },
    ],
    hints: [
      'Initialize `balance_` in `Account`\'s member-initializer list: `explicit Account(double initial) : balance_(initial) {}`. `SavingsAccount` forwards `initial` the same way: `: Account(initial), rate_(rate), minimum_(minimum)`.',
      '`balance_` is `protected`, so `SavingsAccount::addInterest()` can simply do `balance_ += balance_ * rate_;`.',
      'In `SavingsAccount::withdraw`, first `if (balance_ - amount < minimum_) return false;`, then `return Account::withdraw(amount);`. The `Account::` qualifier calls the base version instead of recursing.',
    ],
    solution: `class Account {
public:
    explicit Account(double initial) : balance_(initial) {}

    void deposit(double amount) { balance_ += amount; }

    bool withdraw(double amount) {
        if (amount > balance_) return false;
        balance_ -= amount;
        return true;
    }

    double balance() const { return balance_; }

protected:
    double balance_;
};

class SavingsAccount : public Account {
public:
    SavingsAccount(double initial, double rate, double minimum)
        : Account(initial), rate_(rate), minimum_(minimum) {}

    void addInterest() { balance_ += balance_ * rate_; }

    bool withdraw(double amount) {
        if (balance_ - amount < minimum_) return false;
        return Account::withdraw(amount);
    }

private:
    double rate_;
    double minimum_;
};
`,
    explanation: `**Reuse the base, add only what is new.** \`SavingsAccount\` inherits \`deposit()\` and \`balance()\` unchanged and adds \`addInterest()\` plus two members. Its constructor forwards \`initial\` to \`Account\` in the member-initializer list.

**\`protected\` for derived classes.** \`addInterest()\` updates \`balance_\` directly because \`Account\` made it \`protected\`: visible to subclasses, hidden from everyone else. Outside code still has to go through \`deposit()\` and \`withdraw()\`.

**Specialize by delegating.** \`SavingsAccount::withdraw\` checks only *its* extra rule (the minimum) and then calls \`Account::withdraw(amount)\`, so the overdraft rule lives in exactly one place. The \`Account::\` qualifier matters: without it, the call would find \`SavingsAccount::withdraw\` again and recurse forever.

**A warning sign for Module 06.** \`withdraw\` is not \`virtual\`, so \`SavingsAccount::withdraw\` only *hides* the base version. Code holding an \`Account&\` that refers to a savings account calls \`Account::withdraw\` and bypasses the minimum. Making \`withdraw\` virtual (and marking the derived one \`override\`) closes that hole.`,
  },
  {
    id: 'inheritance-e03', lang: 'python', title: 'Employees and managers', difficulty: 1,
    task: `Create a small payroll hierarchy.

- \`Employee(name, salary)\` stores \`name\` and \`salary\`. \`pay()\` returns the monthly pay: \`salary / 12\`, rounded to 2 decimals. \`__repr__\` returns \`Employee('Ada', 120000)\`.
- \`Manager(Employee)\` takes \`(name, salary, bonus)\`. It must reuse \`Employee.__init__\` via \`super()\`. Its \`pay()\` is the employee pay **plus** \`bonus / 12\` (rounded to 2 decimals) and must call \`super().pay()\`. \`__repr__\` returns \`Manager('Grace', 150000, 24000)\`.

~~~python
m = Manager("Grace", 150000, 24000)
m.pay()      # 14500.0
repr(m)      # "Manager('Grace', 150000, 24000)"
~~~`,
    starter: `class Employee:
    def __init__(self, name, salary):
        raise NotImplementedError

    def pay(self):
        raise NotImplementedError

    def __repr__(self):
        raise NotImplementedError


class Manager(Employee):
    def __init__(self, name, salary, bonus):
        raise NotImplementedError

    def pay(self):
        raise NotImplementedError

    def __repr__(self):
        raise NotImplementedError
`,
    tests: [
      { name: 'Manager is an Employee', code: `assert issubclass(Manager, Employee), "Manager must inherit from Employee"` },
      { name: 'employee pay', code: `assert Employee("Ada", 120000).pay() == 10000.0` },
      { name: 'manager pay adds bonus', code: `assert Manager("Grace", 150000, 24000).pay() == 14500.0` },
      { name: 'manager reuses Employee.__init__', code: `m = Manager("Grace", 150000, 24000)
assert m.name == "Grace" and m.salary == 150000, "name/salary should be set by Employee.__init__"` },
      { name: 'reprs', code: `assert repr(Employee("Ada", 120000)) == "Employee('Ada', 120000)"
assert repr(Manager("Grace", 150000, 24000)) == "Manager('Grace', 150000, 24000)"` },
    ],
    hints: [
      'In `Manager.__init__`, call `super().__init__(name, salary)` first, then store the bonus.',
      '`Manager.pay()` can start with `base = super().pay()` and then add `round(self.bonus / 12, 2)`.',
      'For `__repr__`, an f-string with `!r` quotes the name for you: `f"Manager({self.name!r}, {self.salary}, {self.bonus})"`.',
    ],
    solution: `class Employee:
    def __init__(self, name, salary):
        self.name = name
        self.salary = salary

    def pay(self):
        return round(self.salary / 12, 2)

    def __repr__(self):
        return f"Employee({self.name!r}, {self.salary})"


class Manager(Employee):
    def __init__(self, name, salary, bonus):
        super().__init__(name, salary)
        self.bonus = bonus

    def pay(self):
        return round(super().pay() + self.bonus / 12, 2)

    def __repr__(self):
        return f"Manager({self.name!r}, {self.salary}, {self.bonus})"
`,
    explanation: `**Reuse through \`super()\`.** \`Manager.__init__\` delegates the shared setup to \`Employee.__init__\`, so the rules for \`name\` and \`salary\` live in exactly one place. If \`Employee\` later validates the salary, managers get that check for free.

**Extend, don't copy.** \`Manager.pay()\` calls \`super().pay()\` and adds to it, instead of re-implementing the salary formula. This is the core of inheritance done well: the subclass *specializes* behavior while the base keeps the common part.

In C++ the same idea is written \`Employee::pay()\` inside \`Manager::pay()\`, and the base constructor is called in the member-initializer list: \`Manager(std::string n, double s, double b) : Employee(std::move(n), s), bonus_(b) {}\`.`,
  },
  {
    id: 'inheritance-e04', lang: 'python', title: 'Shape family', difficulty: 2,
    task: `Build a small shape family in which each class adds only what is new.

- \`Shape(name)\` stores \`name\`. \`area()\` raises \`NotImplementedError\` (every concrete shape must override it). \`describe()\` returns \`f"{self.name} with area {self.area():.2f}"\`.
- \`Rectangle(Shape)\` takes \`(width, height)\`, stores both as \`width\` and \`height\`, passes \`"Rectangle"\` as the name via \`super().__init__\`, and implements \`area()\`.
- \`Square(Rectangle)\` takes \`(side)\`, calls \`super().__init__(side, side)\` and then sets \`self.name = "Square"\`. It must **not** define its own \`area()\` or \`describe()\`, and \`describe()\` is written only once, in \`Shape\`.

~~~python
Square(3).describe()     # 'Square with area 9.00'
Rectangle(2, 5).area()   # 10
Shape("blob").area()     # raises NotImplementedError
~~~`,
    starter: `class Shape:
    def __init__(self, name):
        raise NotImplementedError

    def area(self):
        raise NotImplementedError  # correct as is: subclasses must override area()

    def describe(self):
        raise NotImplementedError


class Rectangle(Shape):
    def __init__(self, width, height):
        raise NotImplementedError

    def area(self):
        raise NotImplementedError


class Square(Rectangle):
    def __init__(self, side):
        raise NotImplementedError
`,
    tests: [
      { name: 'class hierarchy', code: `assert issubclass(Rectangle, Shape), "Rectangle must inherit from Shape"
assert issubclass(Square, Rectangle), "Square must inherit from Rectangle"
assert isinstance(Square(2), Shape), "a Square is a Shape"` },
      { name: 'rectangle area and describe', code: `r = Rectangle(2, 5)
assert r.area() == 10, f"expected 10, got {r.area()!r}"
assert r.describe() == "Rectangle with area 10.00", f"got {r.describe()!r}"` },
      { name: 'square reuses Rectangle', code: `s = Square(3)
assert (s.width, s.height) == (3, 3), "Square should set width and height through Rectangle.__init__"
assert s.area() == 9, f"expected 9, got {s.area()!r}"
assert s.describe() == "Square with area 9.00", f"got {s.describe()!r}"` },
      { name: 'Square inherits area and describe', code: `assert "area" not in vars(Square), "Square should inherit area() from Rectangle"
assert "describe" not in vars(Square) and "describe" not in vars(Rectangle), "describe() should be written once, in Shape"` },
      { name: 'Shape.area must be overridden', code: `s = Shape("blob")
assert s.name == "blob", "Shape.__init__ should store the name"
try:
    s.area()
except NotImplementedError:
    pass
else:
    raise AssertionError("Shape.area() should raise NotImplementedError")` },
      { name: 'describe works for new subclasses', code: `class Circle(Shape):
    def __init__(self, r):
        super().__init__("Circle")
        self.r = r

    def area(self):
        return 3.14159 * self.r ** 2

got = Circle(1).describe()
assert got == "Circle with area 3.14", f"got {got!r}"` },
    ],
    hints: [
      '`describe()` belongs in `Shape` and should call `self.area()`: Python looks `area` up on the actual object, so each subclass\'s version is used.',
      '`Rectangle.__init__` starts with `super().__init__("Rectangle")`, then stores `self.width` and `self.height`.',
      '`Square` needs only an `__init__`: `super().__init__(side, side)` followed by `self.name = "Square"`. It inherits `area()` from `Rectangle` and `describe()` from `Shape`.',
    ],
    solution: `class Shape:
    def __init__(self, name):
        self.name = name

    def area(self):
        raise NotImplementedError(f"{type(self).__name__} must implement area()")

    def describe(self):
        return f"{self.name} with area {self.area():.2f}"


class Rectangle(Shape):
    def __init__(self, width, height):
        super().__init__("Rectangle")
        self.width = width
        self.height = height

    def area(self):
        return self.width * self.height


class Square(Rectangle):
    def __init__(self, side):
        super().__init__(side, side)
        self.name = "Square"
`,
    explanation: `**One responsibility per level.** \`Shape\` owns the name and the \`describe()\` format; \`Rectangle\` owns width, height and the area formula; \`Square\` adds only the rule "both sides are equal" and its own name. Nothing is written twice.

**The base calls the subclass.** \`describe()\` is defined once, in \`Shape\`, yet it reports the right area for every shape, because \`self.area()\` is looked up on the actual object: a \`Square\` finds \`Rectangle.area\`, a \`Circle\` finds \`Circle.area\`. Python methods always dispatch on the object's real class; in C++ this needs a \`virtual\` function (Module 06).

**A placeholder in the base.** \`Shape.area()\` raising \`NotImplementedError\` documents that subclasses must override it, but \`Shape("blob")\` can still be created and only fails when \`area()\` is called. Module 07 replaces this with \`abc.ABC\` and \`@abstractmethod\`, which refuse to instantiate \`Shape\` at all.

**Is Square-extends-Rectangle safe here?** Yes, because these shapes are never resized after construction. If \`Rectangle\` let callers change width and height independently, a \`Square\` could no longer keep that promise: that is the Liskov trap from the lesson.`,
  },
];
