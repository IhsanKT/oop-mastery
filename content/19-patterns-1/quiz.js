export default [
  {
    id: 'patterns-1-q01', lang: 'both', type: 'concept', difficulty: 1,
    prompt: 'What is a design pattern?',
    options: [
      { text: 'A named, proven solution to a recurring design problem, giving teams a shared vocabulary.', correct: true, why: 'Correct: a pattern describes roles and trade-offs, and the name lets people communicate quickly.' },
      { text: 'A library of ready-made classes you import and use.', correct: false, why: 'Patterns are ideas, not code you download; each implementation is adapted to its context.' },
      { text: 'A language feature such as templates or decorators.', correct: false, why: 'Language features may implement a pattern, but a pattern is a design-level concept.' },
      { text: 'A rule that every program must apply at least once.', correct: false, why: 'Patterns are optional tools; forcing them into code that does not need them adds complexity.' },
    ],
    explanation: `A design pattern is a **named solution to a recurring problem** in a given context. It describes participants, their responsibilities and the trade-offs, not a fixed block of code. Its biggest practical value is communication: "wrap it in a Decorator" says a lot in four words.`,
  },
  {
    id: 'patterns-1-q02', lang: 'cpp', type: 'output', difficulty: 2,
    prompt: 'What does this Meyers singleton program print?',
    codeLang: 'cpp',
    code: `#include <iostream>

class Logger {
public:
    static Logger& instance() {
        static Logger l;
        return l;
    }
    int uses = 0;
private:
    Logger() { std::cout << "created\\n"; }
};

int main() {
    Logger::instance().uses++;
    Logger::instance().uses++;
    std::cout << Logger::instance().uses << "\\n";
}`,
    options: [
      { text: 'created\n2', correct: true, why: 'Correct: the function-local static is built on the first call only, then reused.' },
      { text: 'created\ncreated\n2', correct: false, why: 'A function-local static is initialised once; later calls return the same object.' },
      { text: '2', correct: false, why: 'The constructor does run, on the first instance() call, and prints created.' },
      { text: 'created\n1', correct: false, why: 'Both increments act on the same object, so the count is 2, not 1.' },
    ],
    explanation: `A function-local \`static\` is initialised the first time control passes through its declaration, and since C++11 that initialisation is **thread-safe**. This is the *Meyers singleton*: lazy, no manual locking, destroyed at program exit.`,
  },
  {
    id: 'patterns-1-q03', lang: 'both', type: 'concept', difficulty: 2,
    prompt: 'Why do singletons usually hurt testability?',
    options: [
      { text: 'They are hidden global state: tests cannot swap them for fakes and state leaks between tests.', correct: true, why: 'Correct: code reaching for instance() has an invisible dependency that cannot be replaced.' },
      { text: 'They are slower than normal objects.', correct: false, why: 'Performance is not the issue; the problem is coupling and shared mutable state.' },
      { text: 'They cannot have methods.', correct: false, why: 'A singleton is an ordinary class with methods; only its instance count is restricted.' },
      { text: 'They always crash in multithreaded programs.', correct: false, why: 'A Meyers singleton is safely constructed; the design issue is hidden global state, not crashes.' },
    ],
    explanation: `A singleton is a global in disguise. Anything that calls \`Config::instance()\` depends on it without saying so, and one test's changes are visible in the next. Prefer creating **one** object at startup and passing it in (dependency injection).`,
  },
  {
    id: 'patterns-1-q04', lang: 'python', type: 'concept', difficulty: 2,
    prompt: 'This singleton overrides `__new__`. What does `a is b` evaluate to?',
    codeLang: 'python',
    code: `class Config:
    _instance = None
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

a = Config()
b = Config()
print(a is b)`,
    options: [
      { text: 'True', correct: true, why: 'Correct: __new__ creates the object once and returns the cached one every later time.' },
      { text: 'False', correct: false, why: 'Each call does go through __new__, but it returns the same stored instance.' },
      { text: 'It raises TypeError because __new__ must not return an existing object.', correct: false, why: '__new__ may return any object; returning an existing instance is a standard technique.' },
      { text: 'It depends on whether __init__ is defined.', correct: false, why: '__init__ runs after __new__ but cannot change which object was returned.' },
    ],
    explanation: `\`Config()\` calls \`__new__\` first. By caching the instance on the class and returning it, every call yields the same object, so \`a is b\` is \`True\`. Be aware that \`__init__\` runs again on each call. In practice a module-level object is simpler.`,
  },
  {
    id: 'patterns-1-q05', lang: 'both', type: 'concept', difficulty: 1,
    prompt: 'What is the intent of the Factory Method/Factory pattern?',
    options: [
      { text: 'Create objects by kind without callers naming the concrete class.', correct: true, why: 'Correct: callers depend on the abstraction and one place decides what to build.' },
      { text: 'Guarantee only one instance of a class exists.', correct: false, why: 'That is Singleton; a factory can produce many instances.' },
      { text: 'Add behaviour to an existing object at run time.', correct: false, why: 'That is Decorator; factories are about creation.' },
      { text: 'Convert one interface into another.', correct: false, why: 'That is Adapter, a structural pattern.' },
    ],
    explanation: `A factory centralises "which concrete class?" decisions. Client code asks for \`"circle"\` and receives a \`Shape\`; adding a new kind means registering it, not editing every caller.`,
  },
  {
    id: 'patterns-1-q06', lang: 'python', type: 'concept', difficulty: 2,
    prompt: 'A registry factory is used here. What does `REG["dog"]().speak()` return?',
    codeLang: 'python',
    code: `REG = {}

def register(name):
    def deco(cls):
        REG[name] = cls
        return cls
    return deco

@register("dog")
class Dog:
    def speak(self): return "Woof"

print(REG["dog"]().speak())`,
    options: [
      { text: '"Woof"', correct: true, why: 'Correct: the decorator stored the class under "dog", and calling the class creates an instance.' },
      { text: 'The class Dog itself, not an instance', correct: false, why: 'REG["dog"] is the class, but the trailing () instantiates it before speak() is called.' },
      { text: 'KeyError, because decorators run only when the class is used', correct: false, why: 'The decorator runs at class definition time, so the key exists already.' },
      { text: 'AttributeError, because the decorator returns None', correct: false, why: 'deco returns cls, so the name Dog still refers to the class.' },
    ],
    explanation: `A class decorator runs once when the class statement executes, so it can register the class in a dict. The factory then looks up the key and calls the class (classes are callables) to build an instance. New subclasses plug in without touching the factory.`,
  },
  {
    id: 'patterns-1-q07', lang: 'both', type: 'concept', difficulty: 2,
    prompt: 'You have a constructor `Pizza(size, cheese, pepperoni, olives, mushrooms, ...)` and calls like `Pizza("L", true, false, true, false)`. Which pattern helps?',
    options: [
      { text: 'Builder: set options by name step by step and validate in build().', correct: true, why: 'Correct: a builder replaces long positional parameter lists, which are unreadable and error-prone.' },
      { text: 'Singleton: only allow one Pizza.', correct: false, why: 'Restricting instance count does nothing for a complicated constructor.' },
      { text: 'Composite: make pizzas hold pizzas.', correct: false, why: 'Composite models part-whole trees, not construction complexity.' },
      { text: 'Adapter: adapt the constructor to a new signature.', correct: false, why: 'Adapter converts between existing interfaces; it does not simplify how an object is assembled.' },
    ],
    explanation: `A long list of same-typed positional parameters is the *telescoping constructor* smell. A **Builder** (\`.size("L").olives().build()\`) names each choice and can validate the combination at the end. In Python, keyword arguments often do the same job.`,
  },
  {
    id: 'patterns-1-q08', lang: 'cpp', type: 'concept', difficulty: 2,
    prompt: 'What does `build()` return for this fluent builder chain?',
    codeLang: 'cpp',
    code: `class PizzaBuilder {
    std::string size_ = "medium";
    std::vector<std::string> toppings_;
public:
    PizzaBuilder& size(std::string s) { size_ = std::move(s); return *this; }
    PizzaBuilder& topping(std::string t) { toppings_.push_back(std::move(t)); return *this; }
    std::string build() const {
        std::string r = size_ + ":";
        for (std::size_t i = 0; i < toppings_.size(); ++i) {
            if (i) r += ",";
            r += toppings_[i];
        }
        return r;
    }
};
auto s = PizzaBuilder().size("large").topping("ham").topping("olives").build();`,
    options: [
      { text: 'large:ham,olives', correct: true, why: 'Correct: each setter returns *this so the calls chain on the same builder.' },
      { text: 'medium:ham,olives', correct: false, why: 'size("large") replaced the default "medium" before build() ran.' },
      { text: 'large:olives', correct: false, why: 'topping() appends to a vector; the second call does not overwrite the first.' },
      { text: 'It does not compile because the setters return references to a temporary.', correct: false, why: 'The temporary builder lives until the end of the full expression, so the whole chain is valid.' },
    ],
    explanation: `A fluent builder returns \`*this\` (by reference) from each setter, which makes chaining possible. The temporary \`PizzaBuilder()\` lives to the end of the full expression, so \`build()\` is called on a live object. Do not store the reference returned from a temporary beyond that statement.`,
  },
  {
    id: 'patterns-1-q09', lang: 'both', type: 'concept', difficulty: 1,
    prompt: 'What is the intent of the Adapter pattern?',
    options: [
      { text: 'Make an existing class usable through the interface clients expect.', correct: true, why: 'Correct: the adapter translates calls without changing the adapted code.' },
      { text: 'Create families of related objects.', correct: false, why: 'That is closer to Abstract Factory; adapters do not create families.' },
      { text: 'Add new responsibilities while keeping the same interface.', correct: false, why: 'That is Decorator: same interface in, same interface out. Adapter changes the interface.' },
      { text: 'Make a class impossible to subclass.', correct: false, why: 'Preventing inheritance is final/sealed, not a pattern for interface mismatch.' },
    ],
    explanation: `An **Adapter** sits between a client and an incompatible class. The client sees the interface it wants; the adapter converts arguments and results. Typical use: wrapping a legacy or third-party API you cannot modify.`,
  },
  {
    id: 'patterns-1-q10', lang: 'python', type: 'concept', difficulty: 2,
    prompt: 'What does `adapter.celsius()` return for a legacy sensor reading 212 degrees Fahrenheit?',
    codeLang: 'python',
    code: `class LegacySensor:
    def get_fahrenheit(self): return 212.0

class SensorAdapter:
    def __init__(self, sensor): self._s = sensor
    def celsius(self):
        return (self._s.get_fahrenheit() - 32) * 5 / 9

adapter = SensorAdapter(LegacySensor())
print(adapter.celsius())`,
    options: [
      { text: '100.0', correct: true, why: 'Correct: (212 - 32) * 5 / 9 = 100, and true division gives a float.' },
      { text: '212.0', correct: false, why: 'The adapter converts the value; it does not pass the Fahrenheit reading through.' },
      { text: '100', correct: false, why: '/ always returns a float in Python 3, so the result prints as 100.0.' },
      { text: '180.0', correct: false, why: '180 is only the intermediate (212 - 32); it still has to be scaled by 5/9.' },
    ],
    explanation: `The adapter holds the legacy object and exposes the Celsius interface callers expect. The conversion lives in exactly one place, so clients never see Fahrenheit. Python's \`/\` is true division and always yields a float.`,
  },
  {
    id: 'patterns-1-q11', lang: 'both', type: 'concept', difficulty: 2,
    prompt: 'Why is Decorator often better than subclassing for optional extras (milk, sugar, whip on a coffee)?',
    options: [
      { text: 'Subclasses would need a class per combination; decorators stack freely at run time.', correct: true, why: 'Correct: n extras give 2^n subclasses, but only n decorators that combine in any order.' },
      { text: 'Decorators are faster because they avoid virtual calls.', correct: false, why: 'Each decorator forwards through a virtual call; speed is not the motivation.' },
      { text: 'Decorators change the interface so clients cannot misuse them.', correct: false, why: 'A decorator keeps the same interface; that is what makes it transparent.' },
      { text: 'Inheritance cannot add behaviour at all.', correct: false, why: 'Inheritance can, but it is fixed at compile time and multiplies classes.' },
    ],
    explanation: `Subclassing binds extras at compile time and creates a class explosion (\`MilkSugarCoffee\`, \`MilkWhipCoffee\`, ...). A **Decorator** wraps a \`Beverage\` and *is* a \`Beverage\`, so wrappers compose in any combination chosen at run time.`,
  },
  {
    id: 'patterns-1-q12', lang: 'cpp', type: 'output', difficulty: 2,
    prompt: 'What does this program print?',
    codeLang: 'cpp',
    code: `#include <iostream>
#include <memory>
#include <string>

struct Beverage {
    virtual ~Beverage() = default;
    virtual double cost() const = 0;
    virtual std::string description() const = 0;
};
struct Espresso : Beverage {
    double cost() const override { return 2.0; }
    std::string description() const override { return "Espresso"; }
};
struct Milk : Beverage {
    std::unique_ptr<Beverage> inner;
    explicit Milk(std::unique_ptr<Beverage> b) : inner(std::move(b)) {}
    double cost() const override { return inner->cost() + 0.5; }
    std::string description() const override { return inner->description() + ", milk"; }
};
struct Sugar : Beverage {
    std::unique_ptr<Beverage> inner;
    explicit Sugar(std::unique_ptr<Beverage> b) : inner(std::move(b)) {}
    double cost() const override { return inner->cost() + 0.25; }
    std::string description() const override { return inner->description() + ", sugar"; }
};

int main() {
    std::unique_ptr<Beverage> d =
        std::make_unique<Sugar>(std::make_unique<Milk>(std::make_unique<Espresso>()));
    std::cout << d->description() << ": " << d->cost() << "\\n";
}`,
    options: [
      { text: 'Espresso, milk, sugar: 2.75', correct: true, why: 'Correct: Sugar asks Milk, which asks Espresso; descriptions append inside-out and costs add up.' },
      { text: 'Espresso, sugar, milk: 2.75', correct: false, why: 'The innermost wrapper (Milk) appends first because Sugar calls inner->description() before adding its text.' },
      { text: 'Espresso: 2', correct: false, why: 'The wrappers delegate and add; the outer object is Sugar, not Espresso.' },
      { text: 'Sugar, Milk, Espresso: 2.75', correct: false, why: 'Descriptions are built starting from the innermost beverage, not the outermost.' },
    ],
    explanation: `Each decorator **delegates** to the object it wraps and then adds its own contribution. \`Sugar.description()\` calls \`Milk.description()\`, which calls \`Espresso.description()\`, so the text grows from the inside out: 2.00 + 0.50 + 0.25 = 2.75.`,
  },
  {
    id: 'patterns-1-q13', lang: 'python', type: 'output', difficulty: 2,
    prompt: 'What does this program print?',
    codeLang: 'python',
    code: `class File:
    def __init__(self, name, size):
        self.name, self._size = name, size
    def size(self):
        return self._size

class Directory:
    def __init__(self, name):
        self.name, self.children = name, []
    def add(self, node):
        self.children.append(node)
    def size(self):
        return sum(c.size() for c in self.children)

root = Directory("root")
root.add(File("a", 10))
sub = Directory("sub")
sub.add(File("b", 5))
sub.add(File("c", 7))
root.add(sub)
print(root.size())
print(sub.size())`,
    options: [
      { text: '22\n12', correct: true, why: 'Correct: root = 10 + sub, and sub = 5 + 7 = 12, so root totals 22.' },
      { text: '10\n12', correct: false, why: 'A directory sums all of its children, including nested directories, not only direct files.' },
      { text: '22\n22', correct: false, why: 'sub only contains b and c, so its size is 12, not the whole tree.' },
      { text: '12\n12', correct: false, why: 'root also contains file a (10), so it is bigger than sub.' },
    ],
    explanation: `The **Composite** pattern gives \`File\` and \`Directory\` the same \`size()\` method. A directory just sums its children's \`size()\` without checking whether they are files or directories, so the recursion handles any depth.`,
  },
  {
    id: 'patterns-1-q14', lang: 'both', type: 'compare', difficulty: 3,
    prompt: 'How does a Python `@decorator` on a function differ from the GoF Decorator pattern?',
    options: [
      { text: 'The Python syntax wraps a function at definition time; the GoF pattern wraps objects at run time with the same interface.', correct: true, why: 'Correct: both wrap and add behaviour, but they apply to different things at different moments.' },
      { text: 'They are exactly the same thing.', correct: false, why: 'The syntax can implement a wrapper, but the GoF pattern is about object composition, not function syntax.' },
      { text: 'The GoF Decorator only exists in C++.', correct: false, why: 'The pattern is language-independent; Python code can implement it with classes.' },
      { text: 'Python decorators change the class hierarchy.', correct: false, why: 'A function decorator replaces a callable; it does not touch inheritance.' },
    ],
    explanation: `Both are **wrapping**. \`@cache\` replaces a function with a wrapper callable once, when the function is defined. The GoF Decorator stacks objects such as \`Milk(Sugar(Espresso()))\`, choosing the combination per instance at run time.`,
  },
  {
    id: 'patterns-1-q15', lang: 'both', type: 'concept', difficulty: 3,
    prompt: 'What is the key idea of the Composite pattern?',
    options: [
      { text: 'Clients treat single objects and groups of objects through the same interface.', correct: true, why: 'Correct: uniform treatment lets recursive structures be used without type checks.' },
      { text: 'A class is built from exactly one other class.', correct: false, why: 'Composite involves a container of many children that implement the shared interface.' },
      { text: 'Objects are created by copying a prototype.', correct: false, why: 'That is Prototype, a creational pattern.' },
      { text: 'Every class must have a parent.', correct: false, why: 'Composite trees have leaves and containers; it does not mandate parents for all classes.' },
    ],
    explanation: `In a **Composite**, leaves and containers implement one component interface, and containers forward calls to their children. A caller invokes \`size()\` or \`render()\` on the root and never branches on "file or folder". The cost is a common interface that may be too wide for leaves.`,
  },
];
