export default [
  {
    id: 'polymorphism-e01', lang: 'cpp', title: 'Polymorphic shapes', difficulty: 2,
    task: `Build a shape hierarchy whose functions work for **any** shape, including shapes written later.

- \`class Shape\`
  - \`virtual double area() const\` returns \`0.0\` and \`virtual std::string name() const\` returns \`"Shape"\` (made-up defaults for now; Module 07 makes them pure virtual).
  - A **virtual destructor**.
- \`class Circle : public Shape\` with \`explicit Circle(double radius)\`. \`area()\` is π·r² (use \`std::numbers::pi\` from \`<numbers>\`); \`name()\` returns \`"Circle"\`.
- \`class Rectangle : public Shape\` with \`Rectangle(double width, double height)\`. \`area()\` is width × height; \`name()\` returns \`"Rectangle"\`.
- \`double totalArea(const std::vector<std::unique_ptr<Shape>>& shapes)\` returns the sum of all areas (\`0\` for an empty vector).
- \`std::string describe(const Shape& s)\` returns \`"<name>: <area>"\` with the area printed with exactly 2 decimals.

Mark every override with \`override\`. \`totalArea\` and \`describe\` must use virtual calls, not type checks, so that a new class derived from \`Shape\` works without any change.

~~~cpp
std::vector<std::unique_ptr<Shape>> shapes;
shapes.push_back(std::make_unique<Circle>(1.0));
shapes.push_back(std::make_unique<Rectangle>(2.0, 3.0));
totalArea(shapes);             // 9.14159... (pi + 6)
describe(*shapes[0]);          // "Circle: 3.14"
describe(Rectangle(2, 3.5));   // "Rectangle: 7.00"
~~~`,
    starter: `#include <memory>
#include <numbers>
#include <string>
#include <vector>

class Shape {
public:
    // TODO: make area() and name() virtual, and add a virtual destructor
    double area() const { return 0.0; }
    std::string name() const { return "Shape"; }
};

class Circle : public Shape {
public:
    explicit Circle(double radius) {}  // TODO: store the radius
    // TODO: override area() and name()
};

class Rectangle : public Shape {
public:
    Rectangle(double width, double height) {}  // TODO: store width and height
    // TODO: override area() and name()
};

double totalArea(const std::vector<std::unique_ptr<Shape>>& shapes) {
    return 0.0;  // TODO: sum the areas
}

std::string describe(const Shape& s) {
    return "";  // TODO: "<name>: <area with 2 decimals>"
}
`,
    tests: [
      { name: 'Shape is a polymorphic base with a virtual destructor', code: `EXPECT((std::is_polymorphic_v<Shape>));
EXPECT((std::has_virtual_destructor_v<Shape>));
EXPECT((std::is_base_of_v<Shape, Circle>));
EXPECT((std::is_base_of_v<Shape, Rectangle>));
EXPECT((std::is_convertible_v<Circle*, Shape*>));
EXPECT((std::is_convertible_v<Rectangle*, Shape*>));
EXPECT((!std::is_convertible_v<double, Circle>));` },
      { name: 'Circle and Rectangle compute their own areas', code: `EXPECT_NEAR(Circle(1.0).area(), 3.141592653589793, 1e-9);
EXPECT_NEAR(Circle(2.0).area(), 12.566370614359172, 1e-9);
EXPECT_NEAR(Rectangle(2.0, 3.0).area(), 6.0, 1e-12);
EXPECT_EQ(Circle(1.0).name(), std::string("Circle"));
EXPECT_EQ(Rectangle(1.0, 1.0).name(), std::string("Rectangle"));` },
      { name: 'virtual calls through a base reference', code: `Circle c(1.0);
Rectangle r(2.0, 3.0);
const Shape& a = c;
const Shape& b = r;
EXPECT_NEAR(a.area(), 3.141592653589793, 1e-9);
EXPECT_NEAR(b.area(), 6.0, 1e-12);
EXPECT_EQ(a.name(), std::string("Circle"));
EXPECT_EQ(b.name(), std::string("Rectangle"));` },
      { name: 'totalArea sums a mix of shapes', code: `EXPECT((std::has_virtual_destructor_v<Shape>));  // needed to delete through unique_ptr<Shape>
std::vector<std::unique_ptr<Shape>> shapes;
EXPECT_NEAR(totalArea(shapes), 0.0, 1e-12);
shapes.push_back(std::make_unique<Circle>(1.0));
shapes.push_back(std::make_unique<Rectangle>(2.0, 3.0));
shapes.push_back(std::make_unique<Rectangle>(0.5, 4.0));
EXPECT_NEAR(totalArea(shapes), 3.141592653589793 + 6.0 + 2.0, 1e-9);` },
      { name: 'describe prints the name and the area with 2 decimals', code: `EXPECT_EQ(describe(Circle(1.0)), std::string("Circle: 3.14"));
EXPECT_EQ(describe(Rectangle(2.0, 3.5)), std::string("Rectangle: 7.00"));
EXPECT_EQ(describe(Circle(10.0)), std::string("Circle: 314.16"));` },
      { name: 'works for a shape written later', code: `struct Triangle : Shape {
    double area() const { return 1.5; }
    std::string name() const { return "Triangle"; }
};
EXPECT_EQ(describe(Triangle{}), std::string("Triangle: 1.50"));
EXPECT((std::has_virtual_destructor_v<Shape>));
std::vector<std::unique_ptr<Shape>> shapes;
shapes.push_back(std::make_unique<Triangle>());
shapes.push_back(std::make_unique<Rectangle>(1.0, 2.0));
EXPECT_NEAR(totalArea(shapes), 3.5, 1e-9);` },
      { name: 'deleting through Shape* runs the derived destructor', code: `EXPECT((std::has_virtual_destructor_v<Shape>));
struct Probe : Shape {
    int& counter_;
    explicit Probe(int& counter) : counter_(counter) {}
    ~Probe() { ++counter_; }
    double area() const { return 0.0; }
    std::string name() const { return "Probe"; }
};
int destroyed = 0;
{
    std::unique_ptr<Shape> p = std::make_unique<Probe>(destroyed);
}
EXPECT_EQ(destroyed, 1);` },
    ],
    hints: [
      'Put `virtual` in front of `area()` and `name()` in `Shape`, add `virtual ~Shape() = default;`, and in the derived classes write `double area() const override { ... }`. The `const` must match exactly, or you hide the base function instead of overriding it.',
      '`totalArea` is a loop: `for (const auto& s : shapes) sum += s->area();`. `describe` takes a `const Shape&`, so `s.name()` and `s.area()` are dispatched to the real class: no `dynamic_cast` needed.',
      'For two decimals, use a `std::ostringstream` (from `<sstream>`) with `std::fixed << std::setprecision(2)` (from `<iomanip>`): `out << s.name() << ": " << std::fixed << std::setprecision(2) << s.area();`. `std::format("{}: {:.2f}", s.name(), s.area())` from `<format>` works too.',
    ],
    solution: `#include <iomanip>
#include <memory>
#include <numbers>
#include <sstream>
#include <string>
#include <vector>

class Shape {
public:
    virtual ~Shape() = default;
    virtual double area() const { return 0.0; }
    virtual std::string name() const { return "Shape"; }
};

class Circle : public Shape {
public:
    explicit Circle(double radius) : radius_(radius) {}
    double area() const override { return std::numbers::pi * radius_ * radius_; }
    std::string name() const override { return "Circle"; }

private:
    double radius_;
};

class Rectangle : public Shape {
public:
    Rectangle(double width, double height) : width_(width), height_(height) {}
    double area() const override { return width_ * height_; }
    std::string name() const override { return "Rectangle"; }

private:
    double width_;
    double height_;
};

double totalArea(const std::vector<std::unique_ptr<Shape>>& shapes) {
    double sum = 0.0;
    for (const auto& s : shapes) sum += s->area();
    return sum;
}

std::string describe(const Shape& s) {
    std::ostringstream out;
    out << s.name() << ": " << std::fixed << std::setprecision(2) << s.area();
    return out.str();
}
`,
    explanation: `**One interface, many behaviors.** \`Shape\` declares *what* every shape can do (\`area()\`, \`name()\`), and each subclass decides *how*. Because the functions are \`virtual\`, a call through a \`const Shape&\` or a \`std::unique_ptr<Shape>\` runs the override of the object's dynamic type. \`override\` makes the compiler confirm that each signature, including \`const\`, really matches.

**Code that never changes.** \`totalArea\` and \`describe\` contain no \`switch\` and no \`dynamic_cast\`. The test's \`Triangle\`, written long after these functions, works immediately: this is the open/closed principle in action.

**Ownership and destruction.** \`std::vector<std::unique_ptr<Shape>>\` stores pointers, so nothing is sliced, and each \`unique_ptr\` deletes its object through a \`Shape*\`. That is only correct because \`~Shape\` is virtual; without it, destroying the vector would be undefined behavior. \`std::has_virtual_destructor_v<Shape>\` checks the rule at compile time.

The defaults in \`Shape\` (\`0.0\`, \`"Shape"\`) are a smell: a plain shape has no meaningful area. Module 07 makes these functions pure virtual, so that \`Shape\` cannot be instantiated and every subclass must implement them.`,
  },
  {
    id: 'polymorphism-e02', lang: 'cpp', title: 'Polymorphic payroll', difficulty: 2,
    task: `Model a payroll in which every kind of worker computes its own monthly pay.

- \`class Employee\`
  - \`explicit Employee(std::string name)\` and \`std::string name() const\`.
  - \`virtual double monthlyPay() const\` returns \`0.0\` in the base (a placeholder).
  - A virtual destructor.
- \`class SalariedEmployee : public Employee\`: \`SalariedEmployee(std::string name, double annualSalary)\`; pay is \`annualSalary / 12\`.
- \`class HourlyEmployee : public Employee\`: \`HourlyEmployee(std::string name, double hours, double rate)\`. The first 160 hours are paid at \`rate\`; every hour **above 160** is paid at \`1.5 × rate\`.
- \`class Contractor final : public Employee\`: \`Contractor(std::string name, double dailyRate, int days)\`; pay is \`dailyRate × days\`. The class must be marked \`final\`.
- \`double payroll(const std::vector<const Employee*>& staff)\` returns the sum of everyone's monthly pay (\`0\` for an empty vector).

Store the name in \`Employee\` and mark every override with \`override\`. \`payroll\` must not check types: a kind of employee added later must work without changing it.

~~~cpp
SalariedEmployee ada("Ada", 60000);   // 5000 per month
HourlyEmployee bo("Bo", 170, 20);     // 160 * 20 + 10 * 30 = 3500
Contractor cy("Cy", 400, 10);         // 4000
std::vector<const Employee*> staff{&ada, &bo, &cy};
payroll(staff);                       // 12500
~~~`,
    starter: `#include <string>
#include <utility>
#include <vector>

class Employee {
public:
    explicit Employee(std::string name) {}  // TODO: store the name
    virtual ~Employee() = default;

    std::string name() const { return ""; }  // TODO

    // Placeholder: each kind of employee overrides this.
    virtual double monthlyPay() const { return 0.0; }
};

class SalariedEmployee : public Employee {
public:
    // TODO: forward the name to Employee and store the salary
    SalariedEmployee(std::string name, double annualSalary) : Employee(name) {}
    double monthlyPay() const override { return 0.0; }  // TODO: annualSalary / 12
};

class HourlyEmployee : public Employee {
public:
    // TODO: forward the name to Employee and store hours and rate
    HourlyEmployee(std::string name, double hours, double rate) : Employee(name) {}
    double monthlyPay() const override { return 0.0; }  // TODO: 1.5x the rate above 160 hours
};

// TODO: mark Contractor final
class Contractor : public Employee {
public:
    // TODO: forward the name to Employee and store dailyRate and days
    Contractor(std::string name, double dailyRate, int days) : Employee(name) {}
    double monthlyPay() const override { return 0.0; }  // TODO: dailyRate * days
};

double payroll(const std::vector<const Employee*>& staff) {
    return 0.0;  // TODO: add up everyone's monthlyPay()
}
`,
    tests: [
      { name: 'hierarchy, virtual destructor and final', code: `EXPECT((std::is_base_of_v<Employee, SalariedEmployee>));
EXPECT((std::is_base_of_v<Employee, HourlyEmployee>));
EXPECT((std::is_base_of_v<Employee, Contractor>));
EXPECT((std::is_convertible_v<Contractor*, Employee*>));
EXPECT((std::has_virtual_destructor_v<Employee>));
EXPECT((std::is_final_v<Contractor>));` },
      { name: 'names are stored in Employee', code: `EXPECT_EQ(Employee("Eve").name(), std::string("Eve"));
EXPECT_EQ(SalariedEmployee("Ada", 60000).name(), std::string("Ada"));
EXPECT_EQ(HourlyEmployee("Bo", 10, 20).name(), std::string("Bo"));
EXPECT_EQ(Contractor("Cy", 400, 10).name(), std::string("Cy"));` },
      { name: 'salaried pay is a twelfth of the annual salary', code: `EXPECT_NEAR(SalariedEmployee("Ada", 60000).monthlyPay(), 5000.0, 1e-9);
EXPECT_NEAR(SalariedEmployee("Al", 50000).monthlyPay(), 50000.0 / 12, 1e-9);` },
      { name: 'hourly pay up to 160 hours', code: `EXPECT_NEAR(HourlyEmployee("Bo", 160, 20).monthlyPay(), 3200.0, 1e-9);
EXPECT_NEAR(HourlyEmployee("Bea", 100, 15).monthlyPay(), 1500.0, 1e-9);
EXPECT_NEAR(HourlyEmployee("Ben", 0, 15).monthlyPay(), 0.0, 1e-9);` },
      { name: 'hourly overtime above 160 hours is paid at 1.5x', code: `EXPECT_NEAR(HourlyEmployee("Bo", 170, 20).monthlyPay(), 3500.0, 1e-9);
EXPECT_NEAR(HourlyEmployee("Bea", 160.5, 10).monthlyPay(), 1607.5, 1e-9);` },
      { name: 'contractor pay', code: `EXPECT_NEAR(Contractor("Cy", 400, 10).monthlyPay(), 4000.0, 1e-9);
EXPECT_NEAR(Contractor("Cal", 250.5, 2).monthlyPay(), 501.0, 1e-9);` },
      { name: 'virtual dispatch through Employee pointers', code: `HourlyEmployee bo("Bo", 170, 20);
Contractor cy("Cy", 400, 10);
const Employee* p = &bo;
const Employee& r = cy;
EXPECT_NEAR(p->monthlyPay(), 3500.0, 1e-9);
EXPECT_NEAR(r.monthlyPay(), 4000.0, 1e-9);` },
      { name: 'payroll sums a mixed staff', code: `SalariedEmployee ada("Ada", 60000);
HourlyEmployee bo("Bo", 170, 20);
Contractor cy("Cy", 400, 10);
std::vector<const Employee*> staff{&ada, &bo, &cy};
EXPECT_NEAR(payroll(staff), 12500.0, 1e-9);
std::vector<const Employee*> nobody;
EXPECT_NEAR(payroll(nobody), 0.0, 1e-12);` },
      { name: 'payroll works for a new kind of employee', code: `struct Intern : Employee {
    Intern() : Employee("Ivy") {}
    double monthlyPay() const override { return 1000.0; }
};
Intern ivy;
SalariedEmployee ada("Ada", 60000);
std::vector<const Employee*> staff{&ivy, &ada};
EXPECT_NEAR(payroll(staff), 6000.0, 1e-9);` },
    ],
    hints: [
      'Store the name as a private `std::string name_;` in `Employee`, set in its initializer list. Each subclass forwards the name: `: Employee(std::move(name)), annualSalary_(annualSalary)`.',
      'For overtime, split the hours: if `hours_ <= 160`, pay `hours_ * rate_`; otherwise pay `160 * rate_ + (hours_ - 160) * rate_ * 1.5`. Put `final` after the class name: `class Contractor final : public Employee`.',
      '`payroll` is a plain loop over base pointers: `for (const Employee* e : staff) total += e->monthlyPay();`. The virtual call picks the right formula for each object.',
    ],
    solution: `#include <string>
#include <utility>
#include <vector>

class Employee {
public:
    explicit Employee(std::string name) : name_(std::move(name)) {}
    virtual ~Employee() = default;

    std::string name() const { return name_; }

    // Placeholder: each kind of employee overrides this.
    virtual double monthlyPay() const { return 0.0; }

private:
    std::string name_;
};

class SalariedEmployee : public Employee {
public:
    SalariedEmployee(std::string name, double annualSalary)
        : Employee(std::move(name)), annualSalary_(annualSalary) {}

    double monthlyPay() const override { return annualSalary_ / 12.0; }

private:
    double annualSalary_;
};

class HourlyEmployee : public Employee {
public:
    static constexpr double kRegularHours = 160.0;
    static constexpr double kOvertimeFactor = 1.5;

    HourlyEmployee(std::string name, double hours, double rate)
        : Employee(std::move(name)), hours_(hours), rate_(rate) {}

    double monthlyPay() const override {
        if (hours_ <= kRegularHours) return hours_ * rate_;
        return kRegularHours * rate_ + (hours_ - kRegularHours) * rate_ * kOvertimeFactor;
    }

private:
    double hours_;
    double rate_;
};

class Contractor final : public Employee {
public:
    Contractor(std::string name, double dailyRate, int days)
        : Employee(std::move(name)), dailyRate_(dailyRate), days_(days) {}

    double monthlyPay() const override { return dailyRate_ * days_; }

private:
    double dailyRate_;
    int days_;
};

double payroll(const std::vector<const Employee*>& staff) {
    double total = 0.0;
    for (const Employee* e : staff) total += e->monthlyPay();
    return total;
}
`,
    explanation: `**Each class owns its pay rule.** The salaried, hourly and contractor formulas live in the classes they belong to, behind one virtual function, \`monthlyPay()\`. \`payroll\` only knows the \`Employee\` interface, so it works unchanged for the \`Intern\` defined in the tests: adding a kind of employee means adding a class, not editing a \`switch\` (the open/closed principle).

**Shared state stays in the base.** The name is stored once, privately, in \`Employee\`, and every constructor forwards it in its initializer list (Module 05). Subclasses add only their own data.

**\`override\` and \`final\`.** \`override\` makes the compiler verify each formula really replaces \`Employee::monthlyPay() const\`. \`final\` on \`Contractor\` declares it a leaf: no class may derive from it, which documents intent and lets the compiler call \`Contractor::monthlyPay\` directly when it knows it has a \`Contractor\`. Naming the overtime constants (\`kRegularHours\`, \`kOvertimeFactor\`) keeps the rule readable.

**Non-owning pointers.** \`payroll\` takes \`const Employee*\` because it only reads the objects; ownership stays with the caller. The virtual destructor matters as soon as someone *owns* employees through base pointers, for example in a \`std::vector<std::unique_ptr<Employee>>\`.`,
  },
  {
    id: 'polymorphism-e03', lang: 'python', title: 'Duck-typed renderer', difficulty: 2,
    task: `Write a renderer that works with **any** object that has a \`render()\` method, with no shared base class.

- \`Button(label)\`: \`render()\` returns the label in square brackets, e.g. \`Button("OK").render() == "[OK]"\`.
- \`Label(text)\`: \`render()\` returns the text unchanged.
- \`Image(src)\`: \`render()\` returns \`"<img " + src + ">"\`, e.g. \`"<img cat.png>"\`.
- These three classes must **not** inherit from any class except \`object\`.
- \`render_all(items)\` calls \`render()\` on every item and returns the results joined with newlines (\`""\` for an empty list).
  - If an item has no \`render\` attribute, raise \`TypeError(f"{type(item).__name__} cannot be rendered")\`, e.g. \`TypeError("int cannot be rendered")\`.
  - An \`AttributeError\` raised **inside** some \`render()\` method is a bug in that class: let it propagate unchanged, do not turn it into a \`TypeError\`.

~~~python
render_all([Button("OK"), Label("Hello"), Image("cat.png")])
# '[OK]\\nHello\\n<img cat.png>'
render_all([Button("OK"), 42])   # TypeError: int cannot be rendered
~~~`,
    starter: `class Button:
    def __init__(self, label):
        self.label = label

    def render(self):
        raise NotImplementedError


class Label:
    def __init__(self, text):
        self.text = text

    def render(self):
        raise NotImplementedError


class Image:
    def __init__(self, src):
        self.src = src

    def render(self):
        raise NotImplementedError


def render_all(items):
    raise NotImplementedError
`,
    tests: [
      { name: 'three unrelated classes', code: `for cls in (Button, Label, Image):
    assert cls.__bases__ == (object,), f"{cls.__name__} should not inherit from a shared base class"` },
      { name: 'each widget renders itself', code: `assert Button("OK").render() == "[OK]", f"got {Button('OK').render()!r}"
assert Label("Hello").render() == "Hello", f"got {Label('Hello').render()!r}"
assert Image("cat.png").render() == "<img cat.png>", f"got {Image('cat.png').render()!r}"` },
      { name: 'render_all joins the results with newlines', code: `got = render_all([Button("OK"), Label("Hello"), Image("cat.png")])
assert got == "[OK]\\nHello\\n<img cat.png>", f"got {got!r}"
assert render_all([]) == "", "an empty list renders as an empty string"
assert render_all([Label("solo")]) == "solo"` },
      { name: 'any object with render() works (duck typing)', code: `class Badge:
    def render(self):
        return "(3)"

got = render_all([Badge(), Label("x")])
assert got == "(3)\\nx", f"got {got!r}"` },
      { name: 'objects without render raise TypeError', code: `class Widget:
    pass

for items, expected in (([Button("OK"), 42], "int cannot be rendered"),
                        ([Widget()], "Widget cannot be rendered")):
    try:
        render_all(items)
    except TypeError as e:
        assert str(e) == expected, f"expected message {expected!r}, got {str(e)!r}"
    else:
        raise AssertionError(f"render_all should raise TypeError: {expected}")` },
      { name: 'errors inside render() are not hidden', code: `class Broken:
    def render(self):
        return self.missing   # a bug inside render()

try:
    render_all([Broken()])
except AttributeError:
    pass
except TypeError:
    raise AssertionError("an AttributeError raised inside render() must propagate, not become a TypeError")
else:
    raise AssertionError("expected the AttributeError from Broken.render() to propagate")` },
    ],
    hints: [
      'Nothing in `render_all` should mention `Button`, `Label` or `Image`: just call `item.render()` on each item and join the results with `"\\n".join(...)`.',
      'EAFP: look the method up inside `try` and catch `AttributeError`, then raise `TypeError(f"{type(item).__name__} cannot be rendered") from None`.',
      'Keep only the lookup in the `try` block: `try: render = item.render` / `except AttributeError: raise TypeError(...) from None`, and call `render()` *after* the `try` (or in an `else:` block), so errors inside `render()` are not caught.',
    ],
    solution: `class Button:
    def __init__(self, label):
        self.label = label

    def render(self):
        return f"[{self.label}]"


class Label:
    def __init__(self, text):
        self.text = text

    def render(self):
        return self.text


class Image:
    def __init__(self, src):
        self.src = src

    def render(self):
        return f"<img {self.src}>"


def render_all(items):
    lines = []
    for item in items:
        try:
            render = item.render
        except AttributeError:
            raise TypeError(f"{type(item).__name__} cannot be rendered") from None
        lines.append(render())
    return "\\n".join(lines)
`,
    explanation: `**Duck typing.** \`Button\`, \`Label\` and \`Image\` share no base class, yet \`render_all\` treats them uniformly: Python looks \`render\` up on each object's own class at run time. The \`Badge\` class in the tests, unknown to \`render_all\`, works just as well. In C++ the same function would need a common base class with a \`virtual\` \`render()\` (or a template, resolved at compile time).

**EAFP, done precisely.** Instead of checking \`hasattr\` first (LBYL), the solution simply tries the lookup and handles the failure. The \`try\` block covers *only* \`item.render\`, not the call: if it wrapped \`item.render()\`, an \`AttributeError\` caused by a bug inside a \`render()\` method (like \`Broken\`'s) would be misreported as "cannot be rendered". \`raise ... from None\` hides the internal \`AttributeError\`, so the traceback shows only the meaningful \`TypeError\`.

**A clear error type.** \`TypeError\` is the conventional exception for "this object does not support the operation", which is exactly what an object without \`render\` is. Module 07 shows how \`typing.Protocol\` lets a type checker verify this structural interface before the program even runs.`,
  },
  {
    id: 'polymorphism-e04', lang: 'python', title: 'Notifiers with a template hook', difficulty: 2,
    task: `Build notifiers in which the base class owns the sending algorithm and subclasses customize a single step, the *hook*.

- \`Notifier\`
  - \`send(msg)\`: strips surrounding whitespace from \`msg\`. If the result is empty, raise \`ValueError("empty message")\`; otherwise return \`self.format(stripped)\`.
  - \`format(msg)\`: the hook. The base version returns \`msg\` unchanged.
- \`EmailNotifier(Notifier)\`: \`format(msg)\` returns \`"Email: " + msg\`.
- \`SmsNotifier(Notifier)\`: \`format(msg)\` returns \`msg\` if it has at most 20 characters; otherwise its first 17 characters followed by \`"..."\` (20 characters in total).
- Subclasses override **only** \`format\`: \`send\` is written once, in \`Notifier\`.
- \`notify_all(notifiers, msg)\` returns a list containing \`n.send(msg)\` for each notifier, in order. It must work with any object that has a \`send\` method.

~~~python
EmailNotifier().send("  Server down ")             # 'Email: Server down'
SmsNotifier().send("Backup finished successfully")  # 'Backup finished s...'
notify_all([Notifier(), EmailNotifier()], "hi")    # ['hi', 'Email: hi']
SmsNotifier().send("   ")                          # ValueError: empty message
~~~`,
    starter: `class Notifier:
    def send(self, msg):
        raise NotImplementedError

    def format(self, msg):
        raise NotImplementedError


class EmailNotifier(Notifier):
    def format(self, msg):
        raise NotImplementedError


class SmsNotifier(Notifier):
    def format(self, msg):
        raise NotImplementedError


def notify_all(notifiers, msg):
    raise NotImplementedError
`,
    tests: [
      { name: 'both notifiers are Notifiers', code: `assert issubclass(EmailNotifier, Notifier), "EmailNotifier must inherit from Notifier"
assert issubclass(SmsNotifier, Notifier), "SmsNotifier must inherit from Notifier"` },
      { name: 'send is written once, in Notifier', code: `for cls in (EmailNotifier, SmsNotifier):
    assert "send" not in vars(cls), f"{cls.__name__} should inherit send() from Notifier"
    assert "format" in vars(cls), f"{cls.__name__} should override the format() hook"` },
      { name: 'the base notifier returns the stripped message', code: `got = Notifier().send("  hello  ")
assert got == "hello", f"got {got!r}"
assert Notifier().format("as is ") == "as is ", "the base hook returns msg unchanged"` },
      { name: 'email format through send', code: `got = EmailNotifier().send("  Server down ")
assert got == "Email: Server down", f"got {got!r}"
assert EmailNotifier().format("x") == "Email: x"` },
      { name: 'sms keeps messages of up to 20 characters', code: `assert SmsNotifier().send("Hi") == "Hi"
exactly_20 = "a" * 20
assert SmsNotifier().send(exactly_20) == exactly_20, "20 characters must not be truncated"` },
      { name: 'sms truncates longer messages to 20 characters', code: `got = SmsNotifier().send("Backup finished successfully")
assert got == "Backup finished s...", f"got {got!r}"
got = SmsNotifier().send("b" * 21)
assert got == "b" * 17 + "...", f"got {got!r}"
assert len(got) == 20` },
      { name: 'empty messages are rejected', code: `for n in (Notifier(), EmailNotifier(), SmsNotifier()):
    try:
        n.send("   ")
    except ValueError as e:
        assert str(e) == "empty message", f"got message {str(e)!r}"
    else:
        raise AssertionError(f"{type(n).__name__}().send('   ') should raise ValueError")` },
      { name: 'a new subclass only needs to override format', code: `class Shout(Notifier):
    def format(self, msg):
        return msg.upper() + "!"

got = Shout().send(" hi ")
assert got == "HI!", f"got {got!r}"` },
      { name: 'notify_all works with any object that has send()', code: `class Pager:
    def send(self, msg):
        return "PAGE " + msg

got = notify_all([Notifier(), EmailNotifier(), SmsNotifier(), Pager()], "hi")
assert got == ["hi", "Email: hi", "hi", "PAGE hi"], f"got {got!r}"
assert notify_all([], "hi") == []` },
    ],
    hints: [
      '`Notifier.send` does the shared steps (strip, validate) and ends with `return self.format(text)`. Because Python dispatches on the actual object, `self.format` finds the subclass\'s override.',
      'In `send`: `text = msg.strip()`, then `if not text: raise ValueError("empty message")`. The base `format` is simply `return msg`.',
      'For SMS: `return msg if len(msg) <= 20 else msg[:17] + "..."`. `notify_all` is one list comprehension: `[n.send(msg) for n in notifiers]`.',
    ],
    solution: `class Notifier:
    def send(self, msg):
        text = msg.strip()
        if not text:
            raise ValueError("empty message")
        return self.format(text)

    def format(self, msg):
        return msg


class EmailNotifier(Notifier):
    def format(self, msg):
        return f"Email: {msg}"


class SmsNotifier(Notifier):
    LIMIT = 20

    def format(self, msg):
        if len(msg) <= self.LIMIT:
            return msg
        return msg[: self.LIMIT - 3] + "..."


def notify_all(notifiers, msg):
    return [n.send(msg) for n in notifiers]
`,
    explanation: `**The template method pattern.** \`Notifier.send\` is the fixed algorithm: strip, validate, format. It is written once, so every notifier rejects empty messages in exactly the same way. Subclasses customize only the step that differs, the \`format\` hook. This works because \`self.format(text)\` inside the base class is dispatched on the actual object: an \`EmailNotifier\` finds \`EmailNotifier.format\`, and the test's \`Shout\` class plugs in without touching \`send\`. Module 20 covers this pattern in depth.

**Inversion of control.** The base class calls the subclass, not the other way round. In C++ the hook would be a \`virtual\` (often \`protected\`) member function called from a non-virtual public \`send()\`: the *non-virtual interface* idiom.

**Polymorphism at two levels.** \`notify_all\` relies on duck typing: it calls \`send\` on anything, including the unrelated \`Pager\` class. \`SmsNotifier.LIMIT\` names the magic number, and \`msg[: self.LIMIT - 3] + "..."\` keeps the total length at exactly 20 characters.`,
  },
];
