export default [
  {
    id: 'multiple-inheritance-e01', lang: 'cpp', title: 'Two interfaces, one Invoice', difficulty: 2,
    task: `Use multiple inheritance of **pure interfaces**.

- \`class Printable\`: virtual destructor and \`virtual std::string print() const = 0\`.
- \`class Serializable\`: virtual destructor and \`virtual std::string serialize() const = 0\`.
- \`class Invoice : public Printable, public Serializable\` with \`Invoice(int number, double amount)\`:
  - \`print()\` returns \`"Invoice #<number>"\`, e.g. \`"Invoice #7"\`.
  - \`serialize()\` returns \`"invoice:<number>:<amount>"\` with the amount printed with exactly 2 decimals, e.g. \`"invoice:7:10.50"\`.
- \`std::string printAll(const std::vector<const Printable*>&)\` joins every \`print()\` with \`"\\n"\`.
- \`std::string saveAll(const std::vector<const Serializable*>&)\` joins every \`serialize()\` with \`";"\`.

Both free functions must work with **any** implementer of the interfaces and use only the interface.

~~~cpp
Invoice a(1, 10.5), b(2, 3);
std::vector<const Printable*> ps{&a, &b};
printAll(ps);   // "Invoice #1\\nInvoice #2"
~~~`,
    starter: `#include <iomanip>
#include <sstream>
#include <string>
#include <vector>

class Printable {
public:
    virtual ~Printable() = default;
    virtual std::string print() const = 0;
};

class Serializable {
public:
    virtual ~Serializable() = default;
    virtual std::string serialize() const = 0;
};

class Invoice : public Printable, public Serializable {
public:
    Invoice(int number, double amount) {}  // TODO: store the values
    std::string print() const override { return ""; }
    std::string serialize() const override { return ""; }
};

std::string printAll(const std::vector<const Printable*>& items) {
    return "";  // TODO
}

std::string saveAll(const std::vector<const Serializable*>& items) {
    return "";  // TODO
}
`,
    tests: [
      { name: 'interfaces are abstract and Invoice implements both', code: `EXPECT((std::is_abstract_v<Printable>));
EXPECT((std::is_abstract_v<Serializable>));
EXPECT((std::is_base_of_v<Printable, Invoice>));
EXPECT((std::is_base_of_v<Serializable, Invoice>));
EXPECT((std::has_virtual_destructor_v<Printable>));
EXPECT((std::has_virtual_destructor_v<Serializable>));
EXPECT((!std::is_abstract_v<Invoice>));` },
      { name: 'Invoice print and serialize', code: `Invoice a(7, 10.5);
EXPECT_EQ(a.print(), std::string("Invoice #7"));
EXPECT_EQ(a.serialize(), std::string("invoice:7:10.50"));
EXPECT_EQ(Invoice(1, 3).serialize(), std::string("invoice:1:3.00"));` },
      { name: 'printAll and saveAll join the results', code: `Invoice a(1, 10.5), b(2, 3);
std::vector<const Printable*> ps{&a, &b};
std::vector<const Serializable*> ss{&a, &b};
EXPECT_EQ(printAll(ps), std::string("Invoice #1\\nInvoice #2"));
EXPECT_EQ(saveAll(ss), std::string("invoice:1:10.50;invoice:2:3.00"));
EXPECT_EQ(printAll({}), std::string(""));` },
      { name: 'the functions work with any implementer', code: `struct Note : Printable {
    std::string print() const override { return "note"; }
};
struct Blob : Serializable {
    std::string serialize() const override { return "blob"; }
};
Note n;
Blob b;
std::vector<const Printable*> ps{&n, &n};
std::vector<const Serializable*> ss{&b};
EXPECT_EQ(printAll(ps), std::string("note\\nnote"));
EXPECT_EQ(saveAll(ss), std::string("blob"));` },
    ],
    hints: [
      'Store \`int number_\` and \`double amount_\` in \`Invoice\`. \`print()\` can use \`"Invoice #" + std::to_string(number_)\`.',
      'For two decimals use \`std::ostringstream os; os << std::fixed << std::setprecision(2) << amount_;\` and then \`os.str()\`.',
      'The free functions loop over the pointers and call only \`print()\` / \`serialize()\`, adding a separator between items, not after the last.',
    ],
    solution: `#include <iomanip>
#include <sstream>
#include <string>
#include <vector>

class Printable {
public:
    virtual ~Printable() = default;
    virtual std::string print() const = 0;
};

class Serializable {
public:
    virtual ~Serializable() = default;
    virtual std::string serialize() const = 0;
};

class Invoice : public Printable, public Serializable {
    int number_;
    double amount_;
public:
    Invoice(int number, double amount) : number_(number), amount_(amount) {}
    std::string print() const override { return "Invoice #" + std::to_string(number_); }
    std::string serialize() const override {
        std::ostringstream os;
        os << "invoice:" << number_ << ':' << std::fixed << std::setprecision(2) << amount_;
        return os.str();
    }
};

std::string printAll(const std::vector<const Printable*>& items) {
    std::string out;
    for (const Printable* p : items) {
        if (!out.empty()) out += "\\n";
        out += p->print();
    }
    return out;
}

std::string saveAll(const std::vector<const Serializable*>& items) {
    std::string out;
    bool first = true;
    for (const Serializable* s : items) {
        if (!first) out += ";";
        out += s->serialize();
        first = false;
    }
    return out;
}
`,
    explanation: `**Interface-style multiple inheritance.** \`Printable\` and \`Serializable\` are pure interfaces: no data, only pure virtual functions and a virtual destructor. \`Invoice\` inherits both and implements each function, which is the safe and common use of multiple inheritance because there is nothing to duplicate or clash.

**Programming to the interface.** \`printAll\` and \`saveAll\` accept pointers to the interfaces and call only \`print()\` and \`serialize()\`, so they work with \`Invoice\` and with classes written later (the test defines two new ones). A class can be a \`Printable\` without being a \`Serializable\`, so each function asks only for what it needs: the Interface Segregation idea.`,
  },
  {
    id: 'multiple-inheritance-e02', lang: 'cpp', title: 'The diamond with a virtual base', difficulty: 3,
    task: `Fix a diamond with **virtual inheritance**.

- \`class Device\`: \`explicit Device(int id)\`, \`int id() const\`, and a public \`static inline int instances = 0;\` that goes **up by one in the constructor and down by one in the destructor**.
- \`class Scanner : virtual public Device\` with \`explicit Scanner(int id)\` and \`std::string scan() const\` returning \`"scan"\`.
- \`class Printer : virtual public Device\` with \`explicit Printer(int id)\` and \`std::string print() const\` returning \`"print"\`.
- \`class Copier : public Scanner, public Printer\` with \`explicit Copier(int id)\` that initializes the \`Device\` base itself, and \`std::string copy() const\` returning \`scan() + "+" + print()\`.

A \`Copier\` must contain **one** \`Device\`, so \`c.id()\` is unambiguous and \`instances\` increases by exactly 1 per \`Copier\`.

~~~cpp
Copier c(7);
c.id();            // 7
c.copy();          // "scan+print"
~~~`,
    starter: `#include <string>

class Device {
    int id_;
public:
    static inline int instances = 0;
    explicit Device(int id) : id_(id) { ++instances; }
    ~Device() { --instances; }
    int id() const { return id_; }
};

class Scanner : public Device {   // TODO: virtual inheritance
public:
    explicit Scanner(int id) : Device(id) {}
    std::string scan() const { return "scan"; }
};

class Printer : public Device {   // TODO: virtual inheritance
public:
    explicit Printer(int id) : Device(id) {}
    std::string print() const { return "print"; }
};

class Copier : public Scanner, public Printer {
public:
    explicit Copier(int id) : Scanner(id), Printer(id) {}   // TODO: initialize Device here
    int id() const { return 0; }   // TODO: remove once Device is a single virtual base
    std::string copy() const { return scan() + "+" + print(); }
};
`,
    tests: [
      { name: 'Scanner and Printer are Devices', code: `EXPECT((std::is_base_of_v<Device, Scanner>));
EXPECT((std::is_base_of_v<Device, Printer>));
EXPECT((std::is_base_of_v<Scanner, Copier>));
EXPECT((std::is_base_of_v<Printer, Copier>));
Scanner s(5);
Printer p(6);
EXPECT_EQ(s.id(), 5);
EXPECT_EQ(p.id(), 6);
EXPECT_EQ(s.scan(), std::string("scan"));
EXPECT_EQ(p.print(), std::string("print"));` },
      { name: 'the Copier has one unambiguous Device id', code: `Copier c(7);
EXPECT_EQ(c.id(), 7);
const Scanner& s = c;
const Printer& p = c;
EXPECT_EQ(s.id(), 7);
EXPECT_EQ(p.id(), 7);` },
      { name: 'a Copier creates exactly one Device', code: `int before = Device::instances;
{
    Copier c(3);
    EXPECT_EQ(Device::instances, before + 1);
}
EXPECT_EQ(Device::instances, before);` },
      { name: 'copy combines scan and print', code: `Copier c(1);
EXPECT_EQ(c.copy(), std::string("scan+print"));
int before = Device::instances;
Scanner s(2);
EXPECT_EQ(Device::instances, before + 1);` },
    ],
    hints: [
      'Write \`class Scanner : virtual public Device\` and the same for \`Printer\`. Their own \`Device(id)\` calls then only apply when they are built alone.',
      'In \`Copier\`\'s constructor initializer list, name the virtual base directly: \`Device(id), Scanner(id), Printer(id)\`.',
      'Delete the stub \`id()\` from \`Copier\`; with a single \`Device\` subobject, \`c.id()\` is unambiguous.',
    ],
    solution: `#include <string>

class Device {
    int id_;
public:
    static inline int instances = 0;
    explicit Device(int id) : id_(id) { ++instances; }
    ~Device() { --instances; }
    int id() const { return id_; }
};

class Scanner : virtual public Device {
public:
    explicit Scanner(int id) : Device(id) {}
    std::string scan() const { return "scan"; }
};

class Printer : virtual public Device {
public:
    explicit Printer(int id) : Device(id) {}
    std::string print() const { return "print"; }
};

class Copier : public Scanner, public Printer {
public:
    explicit Copier(int id) : Device(id), Scanner(id), Printer(id) {}
    std::string copy() const { return scan() + "+" + print(); }
};
`,
    explanation: `**The diamond problem.** \`Copier\` reaches \`Device\` through both \`Scanner\` and \`Printer\`. With ordinary inheritance it would contain *two* \`Device\` subobjects: \`id()\` would be ambiguous and \`instances\` would increase by 2.

**Virtual inheritance.** Declaring \`virtual public Device\` in the two middle classes makes them share a single \`Device\`. That shared base is constructed first, by the **most-derived class**: \`Copier\` lists \`Device(id)\` itself, and the \`Device(id)\` calls in \`Scanner\` and \`Printer\` are ignored when a \`Copier\` is built. When a plain \`Scanner\` is created, its own initializer is used.`,
  },
  {
    id: 'multiple-inheritance-e03', lang: 'python', title: 'Cooperative __init__ with super()', difficulty: 3,
    task: `Make a diamond of classes initialize cooperatively with \`super().__init__(**kwargs)\`.

- \`Base.__init__(self, name="", **kwargs)\`: sets \`self.name\`, increments \`self.base_inits\` (starts at 0 for the object; use \`getattr(self, "base_inits", 0) + 1\`), then calls \`super().__init__(**kwargs)\` (so unknown keywords end in \`TypeError\` from \`object\`).
- \`Timestamped(Base)\`: \`__init__(self, created=0, **kwargs)\` calls \`super().__init__(**kwargs)\` and sets \`self.created\`.
- \`Tagged(Base)\`: \`__init__(self, tags=None, **kwargs)\` calls \`super().__init__(**kwargs)\` and sets \`self.tags = list(tags or [])\`.
- \`Article(Timestamped, Tagged)\` with no body of its own.

~~~python
a = Article(name="Intro", created=5, tags=["py"])
a.name, a.created, a.tags   # ('Intro', 5, ['py'])
a.base_inits                # 1
~~~`,
    starter: `class Base:
    def __init__(self, name="", **kwargs):
        raise NotImplementedError


class Timestamped(Base):
    def __init__(self, created=0, **kwargs):
        raise NotImplementedError


class Tagged(Base):
    def __init__(self, tags=None, **kwargs):
        raise NotImplementedError


class Article(Timestamped, Tagged):
    pass
`,
    tests: [
      { name: 'all fields are set', code: `a = Article(name="Intro", created=5, tags=["py"])
assert a.name == "Intro"
assert a.created == 5
assert a.tags == ["py"]` },
      { name: 'defaults', code: `a = Article()
assert a.name == "" and a.created == 0 and a.tags == []` },
      { name: 'Base.__init__ runs exactly once', code: `a = Article(name="x", created=1, tags=[])
assert a.base_inits == 1, a.base_inits
t = Timestamped(name="t", created=2)
assert t.base_inits == 1 and t.created == 2` },
      { name: 'MRO order', code: `assert [c.__name__ for c in Article.__mro__] == ["Article", "Timestamped", "Tagged", "Base", "object"]` },
      { name: 'unknown keywords are rejected', code: `try:
    Article(name="x", colour="red")
    assert False, "expected TypeError"
except TypeError:
    pass` },
    ],
    hints: [
      'Every \`__init__\` calls \`super().__init__(**kwargs)\` with whatever it did not consume.',
      'Do not call \`Base.__init__(self, ...)\` by name anywhere; \`super()\` already follows the MRO \`Article, Timestamped, Tagged, Base\`.',
      '\`Base\` is last, so its \`super().__init__(**kwargs)\` reaches \`object.__init__\`, which accepts no keywords.',
    ],
    solution: `class Base:
    def __init__(self, name="", **kwargs):
        super().__init__(**kwargs)
        self.name = name
        self.base_inits = getattr(self, "base_inits", 0) + 1


class Timestamped(Base):
    def __init__(self, created=0, **kwargs):
        super().__init__(**kwargs)
        self.created = created


class Tagged(Base):
    def __init__(self, tags=None, **kwargs):
        super().__init__(**kwargs)
        self.tags = list(tags or [])


class Article(Timestamped, Tagged):
    pass
`,
    explanation: `**\`super()\` is "next in the MRO".** For an \`Article\` the MRO is \`Article, Timestamped, Tagged, Base, object\`. \`Timestamped.__init__\` consumes \`created\` and forwards the rest; its \`super()\` is **\`Tagged\`**, not \`Base\`. \`Tagged\` takes \`tags\` and forwards on to \`Base\`, which takes \`name\` and ends at \`object\`. Every initializer runs once, so the shared \`Base\` is initialized once.

**The rules of cooperation.** Each class takes the keywords it needs by name, accepts \`**kwargs\`, and passes the remainder on. If \`Timestamped\` called \`Base.__init__(self)\` directly, \`Tagged\` would be skipped; if both called \`Base.__init__\`, \`Base\` would run twice.`,
  },
  {
    id: 'multiple-inheritance-e04', lang: 'python', title: 'Small mixins', difficulty: 2,
    task: `Write three mixins and combine them.

- \`JsonMixin.to_json(self)\` returns \`json.dumps(self.__dict__, sort_keys=True)\`.
- \`EqualityMixin.__eq__(self, other)\` is true when \`other\` has **exactly the same type** and the same \`__dict__\`; for other types it returns \`NotImplemented\`.
- \`ReprMixin.__repr__(self)\` returns \`ClassName(attr=value, ...)\` using \`type(self).__name__\` and the attributes in insertion order, values shown with \`repr\`, e.g. \`Point(x=1, y=2)\`.
- \`class Point(JsonMixin, EqualityMixin, ReprMixin)\` with \`__init__(self, x, y)\` setting \`x\` and \`y\`.

~~~python
p = Point(1, 2)
repr(p)        # 'Point(x=1, y=2)'
p.to_json()    # '{"x": 1, "y": 2}'
p == Point(1, 2)   # True
~~~`,
    starter: `import json


class JsonMixin:
    def to_json(self):
        raise NotImplementedError


class EqualityMixin:
    def __eq__(self, other):
        raise NotImplementedError


class ReprMixin:
    def __repr__(self):
        raise NotImplementedError


class Point(JsonMixin, EqualityMixin, ReprMixin):
    def __init__(self, x, y):
        self.x = x
        self.y = y
`,
    tests: [
      { name: 'repr', code: `assert repr(Point(1, 2)) == "Point(x=1, y=2)", repr(Point(1, 2))
assert repr(Point("a", None)) == "Point(x='a', y=None)"` },
      { name: 'to_json sorts the keys', code: `assert Point(2, 1).to_json() == '{"x": 2, "y": 1}'
class Z(JsonMixin):
    def __init__(self):
        self.b = 1
        self.a = 2
assert Z().to_json() == '{"a": 2, "b": 1}'` },
      { name: 'equality by type and state', code: `assert Point(1, 2) == Point(1, 2)
assert Point(1, 2) != Point(1, 3)
class Other(EqualityMixin):
    def __init__(self, x, y):
        self.x, self.y = x, y
assert Point(1, 2) != Other(1, 2)
assert Point(1, 2) != (1, 2)
assert Point(1, 2).__eq__((1, 2)) is NotImplemented` },
      { name: 'mixins combine through the MRO', code: `assert Point.__mro__[1:4] == (JsonMixin, EqualityMixin, ReprMixin)
class Pair(ReprMixin, JsonMixin):
    def __init__(self, a, b):
        self.a, self.b = a, b
assert repr(Pair(1, 2)) == "Pair(a=1, b=2)"
assert Pair(1, 2).to_json() == '{"a": 1, "b": 2}'` },
    ],
    hints: [
      'All three mixins read \`self.__dict__\`, which is the host\'s attribute dictionary.',
      'For \`__repr__\`: \`", ".join(f"{k}={v!r}" for k, v in self.__dict__.items())\` inside \`f"{type(self).__name__}(...)"\`.',
      'In \`__eq__\`, \`if type(self) is not type(other): return NotImplemented\`, then compare \`self.__dict__ == other.__dict__\`.',
    ],
    solution: `import json


class JsonMixin:
    def to_json(self):
        return json.dumps(self.__dict__, sort_keys=True)


class EqualityMixin:
    def __eq__(self, other):
        if type(self) is not type(other):
            return NotImplemented
        return self.__dict__ == other.__dict__


class ReprMixin:
    def __repr__(self):
        attrs = ", ".join(f"{k}={v!r}" for k, v in self.__dict__.items())
        return f"{type(self).__name__}({attrs})"


class Point(JsonMixin, EqualityMixin, ReprMixin):
    def __init__(self, x, y):
        self.x = x
        self.y = y
`,
    explanation: `**Small, single-purpose classes.** Each mixin adds exactly one capability and none has an \`__init__\` or state of its own. They rely on a small contract with their host: the instance keeps its data in \`__dict__\`. That is acceptable because it is documented and tiny.

**Composition through the MRO.** \`Point\` lists the mixins as bases, so its MRO is \`Point, JsonMixin, EqualityMixin, ReprMixin, object\`, and each method is found in the right mixin. The same mixins can be mixed into any other class (\`Pair\` reorders them). Returning \`NotImplemented\` from \`__eq__\` lets Python fall back gracefully for foreign types. Note that defining \`__eq__\` without \`__hash__\` makes \`Point\` unhashable; add \`__hash__\` if you need set membership.`,
  },
];
