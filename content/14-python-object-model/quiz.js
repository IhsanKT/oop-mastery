export default [
  {
    id: 'python-object-model-q01', lang: 'python', type: 'concept', difficulty: 1,
    prompt: 'What is `type(type)` in Python?',
    options: [
      { text: '`type` itself: `type` is an instance of `type`.', correct: true, why: 'type is the default metaclass, and it is its own metaclass, which closes the loop.' },
      { text: '`object`', correct: false, why: 'object is the root base class, not the class of type; the two are linked but distinct ideas.' },
      { text: '`class`', correct: false, why: 'class is a keyword, not an object you can get back from type().' },
      { text: '`None`', correct: false, why: 'type() always returns a class; None is an instance of NoneType.' },
    ],
    explanation: `Every object has a type, and classes are objects too. The type of an ordinary class like \`int\` or your own \`Dog\` is \`type\`, and the type of \`type\` is also \`type\`. Separately, \`object\` is the base class of everything (\`type\` inherits from it). These are two relationships: *instance-of* and *subclass-of*.`,
  },
  {
    id: 'python-object-model-q02', lang: 'python', type: 'output', difficulty: 2,
    prompt: 'What does this program print?',
    codeLang: 'python',
    code: `class A:
    @property
    def x(self):
        return "property"

a = A()
a.__dict__["x"] = "instance"
print(a.x)`,
    options: [
      { text: 'property', correct: true, why: 'property is a data descriptor (it defines __set__), so it outranks the instance __dict__.' },
      { text: 'instance', correct: false, why: 'The instance dict only wins over non-data descriptors such as plain functions.' },
      { text: 'AttributeError', correct: false, why: 'Lookup succeeds through the descriptor; writing into __dict__ directly does not raise.' },
      { text: 'property instance', correct: false, why: 'Lookup returns exactly one value; it never combines sources.' },
    ],
    explanation: `The lookup order is: data descriptors on the class, then the instance \`__dict__\`, then non-data descriptors and plain class attributes. \`property\` always defines \`__set__\` (raising if no setter), which makes it a data descriptor. That is why a stray \`__dict__\` entry cannot override it, whereas it would override a method.`,
  },
  {
    id: 'python-object-model-q03', lang: 'python', type: 'concept', difficulty: 2,
    prompt: 'When does `__getattr__` run?',
    options: [
      { text: 'Only when normal attribute lookup fails to find the name.', correct: true, why: 'It is a fallback, called after __getattribute__ raises AttributeError.' },
      { text: 'On every attribute access.', correct: false, why: 'That describes __getattribute__, not __getattr__.' },
      { text: 'Only when assigning to an attribute.', correct: false, why: 'Assignment goes through __setattr__; __getattr__ is only for reading.' },
      { text: 'Only for names that start with an underscore.', correct: false, why: 'There is no name-based filter; any missing name triggers it.' },
    ],
    explanation: `\`__getattribute__\` handles all reads; if it raises \`AttributeError\`, Python then calls \`__getattr__(self, name)\` if you defined it. That makes \`__getattr__\` ideal for delegation to a wrapped object: real attributes are found normally and only unknown names are forwarded.`,
  },
  {
    id: 'python-object-model-q04', lang: 'python', type: 'bug', difficulty: 3,
    prompt: 'Why does reading `Logger().name` crash with `RecursionError`?',
    codeLang: 'python',
    code: `class Logger:
    def __init__(self):
        self.name = "app"

    def __getattribute__(self, attr):
        print("reading", attr)
        return self.__dict__[attr]`,
    options: [
      { text: '`self.__dict__` is itself an attribute read, which calls `__getattribute__` again, endlessly.', correct: true, why: 'Every self.<anything> goes through __getattribute__, including __dict__.' },
      { text: '`print` cannot be used inside a dunder method.', correct: false, why: 'print is fine anywhere; the issue is the self.__dict__ read.' },
      { text: '`__getattribute__` must return a string.', correct: false, why: 'It may return any object; the return type is not the problem.' },
      { text: '`__init__` runs after `__getattribute__`.', correct: false, why: 'Ordering is not the cause; the recursion is triggered by the lookup inside the hook.' },
    ],
    explanation: `Inside \`__getattribute__\`, any \`self.something\` re-enters the hook. Break the loop by delegating to the base implementation: \`return object.__getattribute__(self, attr)\` (or \`super().__getattribute__(attr)\`). Prefer \`__getattr__\` unless you really need to intercept existing attributes.`,
  },
  {
    id: 'python-object-model-q05', lang: 'python', type: 'output', difficulty: 2,
    prompt: 'What does this program print?',
    codeLang: 'python',
    code: `class Point:
    __slots__ = ("x", "y")
    def __init__(self, x, y):
        self.x = x
        self.y = y

p = Point(1, 2)
try:
    p.z = 3
except AttributeError:
    print("AttributeError")`,
    options: [
      { text: 'AttributeError', correct: true, why: 'With __slots__ and no __dict__, only the declared names can be assigned.' },
      { text: 'Nothing; z is added to the instance.', correct: false, why: 'Adding attributes needs a __dict__, which __slots__ removes.' },
      { text: 'TypeError', correct: false, why: 'Assigning an undeclared attribute raises AttributeError, not TypeError.' },
      { text: 'KeyError', correct: false, why: 'There is no dict lookup involved, so KeyError cannot occur.' },
    ],
    explanation: `\`__slots__\` allocates fixed storage for the named attributes and omits the per-instance \`__dict__\`. That saves memory and blocks typos such as \`p.zz = 3\`. Caveat: a subclass that does not define its own \`__slots__\` regains a \`__dict__\`.`,
  },
  {
    id: 'python-object-model-q06', lang: 'python', type: 'concept', difficulty: 2,
    prompt: 'What arguments does Python pass to a descriptor\'s `__set_name__`?',
    options: [
      { text: 'The descriptor, the owner class, and the attribute name it was assigned to.', correct: true, why: 'Called once at class creation as __set_name__(self, owner, name).' },
      { text: 'The instance and the new value.', correct: false, why: 'That describes __set__, which runs on each assignment.' },
      { text: 'The instance and the attribute name.', correct: false, why: 'There is no instance yet when the class body finishes; the owner class is passed instead.' },
      { text: 'Nothing; it receives no arguments.', correct: false, why: 'It needs the owner and name to learn where it was bound.' },
    ],
    explanation: `After the class body runs, \`type.__new__\` calls \`__set_name__(descriptor, owner, name)\` on every attribute that defines it. A validating descriptor uses the name to pick a storage key such as \`"_" + name\`, so one descriptor class can serve many fields without repeating the name.`,
  },
  {
    id: 'python-object-model-q07', lang: 'python', type: 'output', difficulty: 2,
    prompt: 'What does this program print?',
    codeLang: 'python',
    code: `from dataclasses import dataclass, FrozenInstanceError

@dataclass(frozen=True)
class P:
    x: int

p = P(1)
try:
    p.x = 2
except FrozenInstanceError:
    print("FrozenInstanceError")`,
    options: [
      { text: 'FrozenInstanceError', correct: true, why: 'A frozen dataclass makes __setattr__ raise FrozenInstanceError for any assignment.' },
      { text: 'Nothing; p.x becomes 2.', correct: false, why: 'frozen=True exists precisely to forbid that assignment.' },
      { text: 'TypeError', correct: false, why: 'The specific exception is FrozenInstanceError (a subclass of AttributeError), not TypeError.' },
      { text: 'ValueError', correct: false, why: 'The value is not the problem; the assignment itself is blocked.' },
    ],
    explanation: `\`frozen=True\` generates \`__setattr__\` and \`__delattr__\` that raise \`dataclasses.FrozenInstanceError\`, a subclass of \`AttributeError\`. As a bonus, frozen dataclasses with \`eq=True\` get a generated \`__hash__\`, so they can serve as dict keys.`,
  },
  {
    id: 'python-object-model-q08', lang: 'python', type: 'concept', difficulty: 2,
    prompt: 'Why does a dataclass use `items: list = field(default_factory=list)` instead of `items: list = []`?',
    options: [
      { text: 'A fresh list must be created per instance; a shared default would be mutated by all of them (and dataclasses reject it).', correct: true, why: 'Defaults are evaluated once, so a plain [] would be one object shared by every instance.' },
      { text: 'Lists cannot be defaults in Python at all.', correct: false, why: 'They can be defaults for plain functions, which is exactly the classic trap.' },
      { text: '`default_factory` makes the list immutable.', correct: false, why: 'The factory only creates a new ordinary list for each instance.' },
      { text: 'It is only a style preference.', correct: false, why: 'Dataclasses raise ValueError for list, dict and set defaults to prevent shared state.' },
    ],
    explanation: `A default expression is evaluated once when the class body runs, so every instance would share the same list. \`default_factory\` is called for each new instance, giving each its own. This is the dataclass version of the mutable-default-argument bug.`,
  },
  {
    id: 'python-object-model-q09', lang: 'python', type: 'concept', difficulty: 2,
    prompt: 'With `@dataclass(order=True) class V: major: int; minor: int`, what does `sorted([V(1, 5), V(1, 2), V(0, 9)])` yield?',
    options: [
      { text: '`V(0, 9), V(1, 2), V(1, 5)`: compared as tuples of fields in order.', correct: true, why: 'order=True compares (major, minor) lexicographically.' },
      { text: '`V(1, 5), V(1, 2), V(0, 9)`: the original order is kept.', correct: false, why: 'sorted always reorders using the comparison methods the class defines.' },
      { text: '`V(1, 2), V(1, 5), V(0, 9)`: sorted by minor only.', correct: false, why: 'The first field takes priority; minor only breaks ties.' },
      { text: 'A `TypeError`, since dataclasses cannot be compared.', correct: false, why: 'order=True generates __lt__, __le__, __gt__ and __ge__.' },
    ],
    explanation: `\`order=True\` generates the four ordering methods, comparing the instance as a tuple of its fields in declaration order (and only against the same class). Without it, sorting raises \`TypeError\`. C++20's \`auto operator<=>(const V&) const = default;\` does the same job.`,
  },
  {
    id: 'python-object-model-q10', lang: 'python', type: 'concept', difficulty: 2,
    prompt: 'What is `__init_subclass__` for?',
    options: [
      { text: 'A hook on the parent class that runs whenever a subclass is defined, e.g. to register it.', correct: true, why: 'It is called at class creation time with the new subclass as cls.' },
      { text: 'It initializes each new instance of a subclass.', correct: false, why: 'Instances are initialized by __init__; this hook runs when the class statement executes.' },
      { text: 'It forbids subclassing.', correct: false, why: 'It does not block inheritance, though you may raise inside it to reject certain subclasses.' },
      { text: 'It is the same as `__new__`.', correct: false, why: '__new__ creates instances; __init_subclass__ reacts to class creation.' },
    ],
    explanation: `\`__init_subclass__(cls, **kwargs)\` is an implicit classmethod called on the parent whenever a subclass is created. Class-statement keywords (\`class Csv(Base, key="csv")\`) are passed through. It replaces most metaclass use cases such as plugin registries and validating subclass attributes.`,
  },
  {
    id: 'python-object-model-q11', lang: 'python', type: 'compare', difficulty: 3,
    prompt: 'You want every subclass of `Base` to be recorded in a registry. What is the best tool?',
    options: [
      { text: '`__init_subclass__` on `Base`: simple, no metaclass conflicts.', correct: true, why: 'It runs per subclass and composes well with other bases.' },
      { text: 'A metaclass, because it is the most powerful option.', correct: false, why: 'It works, but metaclasses can conflict in multiple inheritance; use the least powerful tool that fits.' },
      { text: 'A class decorator on `Base` only.', correct: false, why: 'A decorator on Base runs once for Base and does not see subclasses defined later.' },
      { text: 'Scanning `globals()` at import.', correct: false, why: 'It is fragile and misses classes defined in other modules or inside functions.' },
    ],
    explanation: `Prefer \`__init_subclass__\` when you need to react to subclass creation. A class decorator is applied explicitly to each class that wants it. A metaclass is the heavy tool for changing how classes are built (namespace, \`__new__\`), and two unrelated metaclasses cannot be combined without a common derived metaclass.`,
  },
  {
    id: 'python-object-model-q12', lang: 'python', type: 'concept', difficulty: 1,
    prompt: 'Given `class Color(Enum): RED = 1`, what are `Color.RED.name` and `Color.RED.value`?',
    options: [
      { text: '`\'RED\'` and `1`', correct: true, why: 'name is the member\'s identifier as a string; value is what was assigned.' },
      { text: '`1` and `\'RED\'`', correct: false, why: 'This swaps them: name is the label, value is the assigned data.' },
      { text: '`\'Color.RED\'` and `1`', correct: false, why: 'Color.RED is how str() prints the member; .name is only RED.' },
      { text: 'Both are `1`.', correct: false, why: 'The name is a string identifier, independent of the value.' },
    ],
    explanation: `Each enum member is a singleton object with \`.name\` (its identifier) and \`.value\` (its assigned value). \`Color(1)\` looks up by value and \`Color["RED"]\` by name. Comparing members with \`is\` is safe because each exists exactly once.`,
  },
  {
    id: 'python-object-model-q13', lang: 'both', type: 'compare', difficulty: 3,
    prompt: 'How does Python\'s `__slots__` compare to a C++ `struct` layout?',
    options: [
      { text: 'Both fix the set of fields, but C++ also fixes offsets and types at compile time; Python slots still hold references to objects.', correct: true, why: 'A slot is a pointer-sized reference to a Python object, not an inline typed value.' },
      { text: 'They are identical: slots store unboxed values inline.', correct: false, why: 'Slot values are still full Python objects referenced from the instance.' },
      { text: 'A C++ struct can gain members at run time like a Python object.', correct: false, why: 'C++ layout is fixed once compiled; there is no run-time member addition.' },
      { text: '`__slots__` gives Python static typing of fields.', correct: false, why: 'Slots restrict names only; they do not constrain value types.' },
    ],
    explanation: `\`__slots__\` gets Python closer to the C++ model by fixing the attribute names and dropping the dict, but each slot holds a reference to an object whose type can be anything. In C++, both the names and the exact type and offset of each member are decided at compile time, and a \`double\` member really is eight bytes inside the struct.`,
  },
  {
    id: 'python-object-model-q14', lang: 'python', type: 'concept', difficulty: 3,
    prompt: 'How does `obj.method()` get its bound `self`?',
    options: [
      { text: 'Functions are non-data descriptors: `function.__get__(obj, cls)` returns a bound method.', correct: true, why: 'The descriptor protocol creates a method object that stores obj as self.' },
      { text: 'The interpreter copies `obj` into each method when the class is created.', correct: false, why: 'Binding happens per access, not at class creation, and no copy is made.' },
      { text: 'Every instance stores its own copy of every method.', correct: false, why: 'Methods live once on the class; instances share them.' },
      { text: '`self` is a reserved keyword the compiler injects.', correct: false, why: 'self is an ordinary parameter name; binding is done by the descriptor protocol.' },
    ],
    explanation: `A function defined in a class body is a non-data descriptor. Accessing \`obj.method\` calls \`method.__get__(obj, type(obj))\`, which returns a bound method storing \`obj\`. Accessing \`Class.method\` returns the plain function, so you pass \`self\` manually. \`property\`, \`classmethod\` and \`staticmethod\` are implemented the same way.`,
  },
  {
    id: 'python-object-model-q15', lang: 'python', type: 'concept', difficulty: 2,
    prompt: 'In a dataclass, where should you validate that `age` is non-negative?',
    options: [
      { text: 'In `__post_init__`, which runs right after the generated `__init__`.', correct: true, why: 'The generated __init__ stores the fields and then calls __post_init__ if defined.' },
      { text: 'In `__init__`, by writing your own and keeping `@dataclass` to generate it too.', correct: false, why: 'A user-defined __init__ is kept, and the generated one is skipped, losing the generation benefit.' },
      { text: 'In `__repr__`.', correct: false, why: 'repr only formats the object; it is not called during construction.' },
      { text: 'Dataclasses cannot validate.', correct: false, why: '__post_init__ is the built-in hook for validation and derived fields.' },
    ],
    explanation: `The generated \`__init__\` assigns the fields and then calls \`self.__post_init__()\` when it exists. Raise \`ValueError\` there to reject bad input, or compute derived fields. For frozen dataclasses, use \`object.__setattr__(self, name, value)\` if you must assign inside it. C++ cannot add members at run time, which is another way its approach differs: all fields are declared in the class definition.`,
  },
];
