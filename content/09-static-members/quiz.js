export default [
  {
    id: 'static-members-q01', lang: 'both', type: 'concept', difficulty: 1,
    prompt: 'What is a static member (C++) or class attribute (Python)?',
    options: [
      { text: 'A variable that belongs to the class itself, with one shared copy no matter how many instances exist.', correct: true, why: 'Right. Class-level data is stored once and is shared by all instances.' },
      { text: 'A variable that is copied into every new instance so each object has its own value.', correct: false, why: 'That describes an ordinary instance member. Class-level members are not copied per object.' },
      { text: 'A constant that can never be changed after the program starts.', correct: false, why: 'Static does not mean constant. Static data can change (a counter, for example); constness is a separate property.' },
      { text: 'A variable that exists only while at least one instance is alive.', correct: false, why: 'Static data exists independently of instances, for the program\'s lifetime in C++ and as long as the class in Python.' },
    ],
    explanation: `Class-level members model facts about the class as a whole: a counter of instances, a shared configuration, a table of allowed values. They are stored once on the class rather than in every object, and they exist even before the first instance is created.`,
  },
  {
    id: 'static-members-q02', lang: 'cpp', type: 'output', difficulty: 1,
    prompt: 'What does this program print?',
    codeLang: 'cpp',
    code: `#include <iostream>

struct Item {
    static inline int n = 0;
    Item() { ++n; }
};

int main() {
    Item a, b;
    {
        Item c;
    }
    std::cout << Item::n << " " << a.n << "\\n";
}`,
    options: [
      { text: '3 3', correct: true, why: 'There is a single `n`; each of the three constructions incremented it, and nothing decrements it. `a.n` names the same variable as `Item::n`.' },
      { text: '2 2', correct: false, why: 'There is no destructor that decrements `n`, so the destroyed `c` still counts.' },
      { text: '3 1', correct: false, why: 'A static member is not per-object; `a.n` is the same shared variable and cannot be 1.' },
      { text: '1 1', correct: false, why: 'The constructor runs for each object, and all of them increment the same variable.' },
    ],
    explanation: `A static data member has exactly one instance, shared by all objects of the class. Accessing it through an object (\`a.n\`) is allowed but means exactly the same as \`Item::n\`. Because no destructor decrements it, the count is of constructions, not of live objects.`,
  },
  {
    id: 'static-members-q03', lang: 'cpp', type: 'bug', difficulty: 1,
    prompt: 'This class does not compile. What is wrong?',
    codeLang: 'cpp',
    code: `class Account {
    double balance_ = 0;
    static int total_;
public:
    static double balance() { return balance_; }
};`,
    options: [
      { text: 'A static member function has no `this`, so it cannot read the non-static `balance_`.', correct: true, why: 'Right. Without an object there is no `balance_` to read; only static members are accessible implicitly.' },
      { text: 'Static functions must be defined outside the class.', correct: false, why: 'Static functions can be defined inline in the class body like any other member.' },
      { text: '`balance_` must be public for static functions to read it.', correct: false, why: 'Access control is not the problem; a static member function has full access to private members, but it has no object.' },
      { text: 'Static functions may only return `void`.', correct: false, why: 'Static member functions can return any type; `fromCelsius` factories return objects.' },
    ],
    explanation: `Non-static members belong to a particular object, reached through \`this\`. A static member function is called without an object, so \`this\` does not exist. Fix it by making the function non-static, passing an \`Account&\` parameter, or returning a static member such as \`total_\`.`,
  },
  {
    id: 'static-members-q04', lang: 'python', type: 'output', difficulty: 2,
    prompt: 'What does this program print?',
    codeLang: 'python',
    code: `class Counter:
    count = 0
    def hit(self):
        self.count += 1

a = Counter()
b = Counter()
a.hit()
a.hit()
b.hit()
print(Counter.count, a.count, b.count)`,
    options: [
      { text: '0 2 1', correct: true, why: '`self.count += 1` reads the class value but stores the result in the instance, so `Counter.count` stays 0 while `a` and `b` get their own counts.' },
      { text: '3 3 3', correct: false, why: 'This assumes `self.count += 1` updates the shared class attribute; assignment through `self` never does.' },
      { text: '3 2 1', correct: false, why: 'The class attribute is never assigned, so it cannot be 3; only the instance attributes were created.' },
      { text: '0 0 0', correct: false, why: 'The instances do receive their own attributes through the assignment, so `a.count` is 2 and `b.count` is 1.' },
    ],
    explanation: `\`self.count += 1\` is \`self.count = self.count + 1\`. The right side finds \`Counter.count\` (0) because the instance has no attribute yet; the left side then creates an **instance attribute**, shadowing the class one. To change the shared counter write \`Counter.count += 1\` or \`type(self).count += 1\`.`,
  },
  {
    id: 'static-members-q05', lang: 'python', type: 'concept', difficulty: 2,
    prompt: 'Given the code below, what is `type(GlutenFreePizza.margherita())`?',
    codeLang: 'python',
    code: `class Pizza:
    def __init__(self, toppings):
        self.toppings = toppings

    @classmethod
    def margherita(cls):
        return cls(["tomato", "mozzarella"])

class GlutenFreePizza(Pizza):
    pass`,
    options: [
      { text: '`GlutenFreePizza`, because `cls` is the class the method was called on.', correct: true, why: 'Right. A classmethod receives the actual class through which it was invoked, so `cls(...)` builds the subclass.' },
      { text: '`Pizza`, because the method is defined in `Pizza`.', correct: false, why: 'The defining class does not matter. `cls` is bound to the receiver, here `GlutenFreePizza`.' },
      { text: '`type`, because classmethods return classes.', correct: false, why: 'The method returns an instance created by `cls(...)`, not a class object.' },
      { text: 'It raises `TypeError`, since subclasses cannot call a parent\'s classmethod.', correct: false, why: 'Classmethods are inherited like any other method.' },
    ],
    explanation: `A \`@classmethod\` gets the class as its first argument. Calling it on a subclass passes the subclass, so alternate constructors written with \`cls(...)\` automatically create instances of the right type. That is the main advantage over a plain static factory that hardcodes the base class.`,
  },
  {
    id: 'static-members-q06', lang: 'python', type: 'compare', difficulty: 2,
    prompt: 'How do `@staticmethod` and `@classmethod` differ?',
    options: [
      { text: 'A classmethod receives the class as its first parameter (`cls`); a staticmethod receives neither the instance nor the class.', correct: true, why: 'Right. A staticmethod is a plain function placed in the class namespace.' },
      { text: 'A staticmethod receives `self`; a classmethod receives `cls`.', correct: false, why: 'Static methods receive no implicit first argument at all, neither `self` nor `cls`.' },
      { text: 'Both receive `cls`; the only difference is that staticmethods cannot be inherited.', correct: false, why: 'Staticmethods are inherited normally and get no `cls`.' },
      { text: 'A classmethod can only be called on the class, a staticmethod only on instances.', correct: false, why: 'Both kinds can be called on the class or on an instance.' },
    ],
    explanation: `Use \`@classmethod\` when the function needs the class (alternate constructors, reading class data). Use \`@staticmethod\` for a helper related to the class that needs neither \`self\` nor \`cls\`. Instance methods get \`self\`.`,
  },
  {
    id: 'static-members-q07', lang: 'cpp', type: 'concept', difficulty: 3,
    prompt: 'A class counts live instances with `++live` in its default constructor and `--live` in its destructor. A program copies one object (`Widget b = a;`) and lets both die. What is the count afterwards?',
    codeLang: 'cpp',
    code: `class Widget {
    static inline int live_ = 0;
public:
    Widget()  { ++live_; }
    ~Widget() { --live_; }
    static int live() { return live_; }
};`,
    options: [
      { text: '-1 relative to the start, because the copy constructor (compiler-generated) did not increment but the destructor decremented.', correct: true, why: 'Right. The implicit copy constructor knows nothing about `live_`, so the second object is destroyed without ever being counted.' },
      { text: '0, because every object that is created is destroyed.', correct: false, why: 'Only the default constructor counts; the copy was created through a different constructor that does not increment.' },
      { text: '+1, because copies are never destroyed.', correct: false, why: 'Both objects are destroyed at the end of their scope, running the destructor twice.' },
      { text: 'The program does not compile without a user-written copy constructor.', correct: false, why: 'The compiler generates a copy constructor, which is exactly why the bug is silent.' },
    ],
    explanation: `The implicit copy constructor copies members but does not run your counting code, while the destructor always runs. Fix it by counting in **every** constructor: add \`Widget(const Widget&) { ++live_; }\`. A defaulted move constructor would have the same problem if you add one.`,
  },
  {
    id: 'static-members-q08', lang: 'cpp', type: 'concept', difficulty: 2,
    prompt: 'What does `inline` do in `static inline int counter = 0;` inside a class (C++17)?',
    options: [
      { text: 'It defines the static data member right in the class, so no separate definition in a `.cpp` file is needed.', correct: true, why: 'Right. Inline variables can appear in many translation units while remaining a single object.' },
      { text: 'It makes accesses to `counter` faster by inlining the variable into each use.', correct: false, why: 'For variables, `inline` is about linkage and definitions, not performance.' },
      { text: 'It makes the member constant.', correct: false, why: 'The variable is still modifiable; use `const` or `constexpr` for that.' },
      { text: 'It creates one copy of `counter` per translation unit.', correct: false, why: 'The opposite: an inline variable is one object shared by all translation units.' },
    ],
    explanation: `Before C++17 a static data member was only declared in the class and needed exactly one out-of-class definition (\`int Widget::counter = 0;\`) in one source file, or the linker reported an undefined reference. \`inline\` variables (C++17) lift that restriction.`,
  },
  {
    id: 'static-members-q09', lang: 'cpp', type: 'output', difficulty: 2,
    prompt: 'What does this program print?',
    codeLang: 'cpp',
    code: `#include <iostream>

int next() {
    static int n = 10;
    return ++n;
}

int main() {
    int a = next();
    int b = next();
    int c = next();
    std::cout << a << " " << b << " " << c << "\\n";
}`,
    options: [
      { text: '11 12 13', correct: true, why: 'The static is initialized to 10 only on the first call and then keeps its value between calls.' },
      { text: '11 11 11', correct: false, why: 'That would be the result for an ordinary local variable that is re-initialized on every call.' },
      { text: '10 11 12', correct: false, why: '`++n` is a pre-increment, so the first call returns 11, not the initial 10.' },
      { text: '11 12 12', correct: false, why: 'Each call increments the same variable, so the third call gives 13.' },
    ],
    explanation: `A function-local \`static\` is initialized once, the first time control passes its declaration, and lives until the program ends. This is also a good way to avoid the **static initialization order fiasco**: a global used from another translation unit may not be constructed yet, but a function-local static is always constructed on first use.`,
  },
  {
    id: 'static-members-q10', lang: 'both', type: 'compare', difficulty: 2,
    prompt: 'What is the key difference between a C++ static data member and a Python class attribute?',
    options: [
      { text: 'A C++ static is one variable; a Python class attribute is a shared default that an instance can shadow with its own attribute.', correct: true, why: 'Right. In Python, assignment through `self` creates an instance attribute and the class value is untouched.' },
      { text: 'C++ statics can change at run time, but Python class attributes are always constants.', correct: false, why: 'Class attributes are ordinary variables and can be reassigned.' },
      { text: 'Python class attributes can only hold numbers.', correct: false, why: 'Any object can be a class attribute, including lists and dictionaries.' },
      { text: 'Python needs a keyword `static`; C++ does not.', correct: false, why: 'It is the reverse: C++ uses `static`, Python simply defines the name in the class body.' },
    ],
    explanation: `In C++ there is exactly one \`User::count\`; writing it from any member updates it. In Python, attribute reads fall through from the instance to the class, but writes through an instance go to the instance, so \`self.count += 1\` creates a per-instance attribute. Use \`type(self).count\` or the class name for class-level state.`,
  },
  {
    id: 'static-members-q11', lang: 'python', type: 'concept', difficulty: 2,
    prompt: 'A class defines `colour = "red"` at class level. What does `obj.colour` return when `obj` has no instance attribute named `colour`?',
    options: [
      { text: '`"red"`: the lookup falls back from the instance to the class.', correct: true, why: 'Right. Attribute lookup checks the instance dictionary and then the class (and its bases).' },
      { text: '`AttributeError`, since class attributes are only reachable through the class.', correct: false, why: 'Instances can read class attributes; this is what makes class-level defaults work.' },
      { text: '`None`, since the instance has not set it.', correct: false, why: 'Python raises an error for truly missing attributes; here the class provides the value.' },
      { text: '`"red"`, but a copy of it is stored in the instance.', correct: false, why: 'Reading never copies anything into the instance; only assignment creates an instance attribute.' },
    ],
    explanation: `Python looks for \`obj.colour\` in the instance dictionary first, then in the class and its bases. That is why class attributes work as defaults. An instance only gets its own \`colour\` when you assign to \`obj.colour\`.`,
  },
  {
    id: 'static-members-q12', lang: 'python', type: 'concept', difficulty: 2,
    prompt: 'After `a = Config(); b = Config(); Config.timeout = 60`, what do `a.timeout` and `b.timeout` show, assuming neither instance ever assigned `timeout`?',
    options: [
      { text: 'Both show 60, because they read the class attribute.', correct: true, why: 'Right. No instance attribute shadows it, so both lookups reach the changed class attribute.' },
      { text: 'Both keep the old value, because instances copy the class attributes at creation time.', correct: false, why: 'Instances do not take a snapshot; lookups are made when the attribute is read.' },
      { text: 'Only `b` shows 60, because it was created last.', correct: false, why: 'Creation order does not matter; neither instance has its own value.' },
      { text: 'It raises `AttributeError`, because the class attribute was added after instances existed.', correct: false, why: 'Classes are mutable and attributes may be added at any time; existing instances see them.' },
    ],
    explanation: `Class attributes are looked up at access time. Changing \`Config.timeout\` is visible through every instance that has not shadowed the name with its own attribute. If one instance had run \`a.timeout = 5\`, only that instance would keep 5.`,
  },
  {
    id: 'static-members-q13', lang: 'python', type: 'bug', difficulty: 3,
    prompt: 'Subclasses of `Shape` use `Shape.unit_square()` and get a plain `Shape` back. What is the bug?',
    codeLang: 'python',
    code: `class Shape:
    def __init__(self, w, h):
        self.w, self.h = w, h

    @classmethod
    def unit_square(cls):
        return Shape(1, 1)`,
    options: [
      { text: 'The classmethod hardcodes `Shape`; it should return `cls(1, 1)` so the receiving subclass is instantiated.', correct: true, why: 'Right. Using the class name ignores which class the method was called on.' },
      { text: 'It should be a `@staticmethod`, because classmethods cannot return instances.', correct: false, why: 'Classmethods can and usually do return instances; a staticmethod could not even see the subclass.' },
      { text: 'The method must call `super().__init__` before returning.', correct: false, why: '`__init__` already runs when the object is constructed; this is about which class is built.' },
      { text: '`cls` must be declared as a default argument.', correct: false, why: '`cls` is supplied automatically by the `classmethod` descriptor.' },
    ],
    explanation: `The whole point of using a classmethod instead of a staticmethod is \`cls\`. Writing \`Shape(1, 1)\` makes every subclass call return the base type, silently losing subclass behavior. Replace it with \`return cls(1, 1)\`.`,
  },
  {
    id: 'static-members-q14', lang: 'python', type: 'concept', difficulty: 3,
    prompt: 'A helper `is_valid_email(text)` needs neither the instance nor the class. Where should it go?',
    options: [
      { text: 'Either a module-level function or a `@staticmethod`; choose the static method when it is conceptually part of the class and should be namespaced or overridable.', correct: true, why: 'Right. Both are plain functions, so it is a question of organization.' },
      { text: 'It must be a `@staticmethod`, because Python does not allow free functions next to classes.', correct: false, why: 'Module-level functions are idiomatic Python and are often the simplest choice.' },
      { text: 'It must be a `@classmethod`, because every function in a class needs `cls`.', correct: false, why: 'Only functions that actually need the class should be classmethods.' },
      { text: 'It must be an instance method that ignores `self`.', correct: false, why: 'An unused `self` forces callers to create an object for no reason.' },
    ],
    explanation: `A \`@staticmethod\` is just a function that lives in the class namespace; it gains discoverability (\`Email.is_valid(...)\`) and can be overridden in subclasses, but it does not gain any capability over a module function. Python does not push you towards static methods the way Java does, so prefer a module function if the class adds nothing.`,
  },
  {
    id: 'static-members-q15', lang: 'cpp', type: 'concept', difficulty: 3,
    prompt: 'What is `static constexpr double Pi = 3.14159265;` inside a class (C++17 or later)?',
    options: [
      { text: 'A compile-time constant belonging to the class, implicitly `inline`, usable in constant expressions without an out-of-class definition.', correct: true, why: 'Right. Since C++17 `static constexpr` data members are implicitly inline, so no separate definition is required.' },
      { text: 'A per-object constant stored once in every instance.', correct: false, why: '`static` makes it class-level, so no instance stores it.' },
      { text: 'A variable that can be changed at run time but only inside static functions.', correct: false, why: '`constexpr` implies `const`; it cannot be modified anywhere.' },
      { text: 'It is illegal for `double`, because only integral types may be `static constexpr`.', correct: false, why: 'Any literal type is allowed, including `double`; the old in-class initializer restriction applied to non-constexpr `static const`.' },
    ],
    explanation: `\`static constexpr\` members are ideal for named constants such as \`Temperature::AbsoluteZeroC\`. They are compile-time values, shared by the class, and (in C++17) implicitly \`inline\`, so taking their address does not produce a linker error as it could in C++11/14 without an out-of-class definition.`,
  },
];
