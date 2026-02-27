# Schema-Based UI with Declarative Affordance and Operation Declarations

## Landscape Analysis and Design Path

---

## Introduction: The declarative trick and why it matters now

When a developer builds a form — say, a settings panel with a name field, a timezone dropdown, and a notification toggle — they are juggling at least three separate concerns at once. First, *what input do I need?* (a string, an enum from a list, a boolean). Second, *what widget should capture it?* (a text field, a select box, a switch). Third, *how should that widget look?* (font, spacing, colors, layout). Traditionally these three concerns are tangled together in imperative UI code: a `<select>` tag that simultaneously declares the data type, the widget choice, and the styling.

Over the last decade, a family of declarative programming toolkits has emerged that untangles these concerns. The pioneering example is **react-jsonschema-form (RJSF)** [20]: you provide a JSON Schema describing the *shape* of the data you want to capture, optionally a UI Schema hinting at *which widgets* to use, and optionally a theme controlling *how they render* — three separate, declarative layers that compose into a fully functional form. The developer expresses the "what" at each level; the framework handles the "how."

This separation — which we might call the **declarative trick** — has proven powerful enough that a constellation of tools now exploits it across different domains. **JSON Forms** [21] (Eclipse-backed) refined the pattern by introducing a tester-based renderer registry, where each widget declares a priority function and the highest-scoring match wins — making the widget-selection layer itself pluggable and extensible. **AutoForm** [22] replaced JSON Schema with Zod, letting TypeScript developers define data shape and get a complete form with zero configuration, while still allowing per-field overrides. **Formily** [23] (Alibaba) added a reactive engine for dynamic inter-field dependencies. **TanStack Table** [29] applied the same principle to data tables: you declare column definitions with sorting, filtering, and pagination capabilities, and the framework provides all the state management logic headlessly — you bring your own rendering.

The advantages of this declarative separation are substantial. **Composability**: the same data schema can drive a web form, a mobile form, and an API validation layer. **Evolvability**: changing the UI framework (say, from Material UI to shadcn/ui) means swapping the renderer without touching the schema. **Consistency**: validation rules live in one place (the schema) rather than being scattered across UI code. **Auditability**: a schema is inspectable, diffable, version-controllable data — not opaque render logic. **Generativity**: because the schema is a static data structure, it can be generated, transformed, and composed programmatically.

This last advantage — generativity — has become especially significant with the rise of AI-assisted development. Recent research in **structured generation and constrained decoding** (2024–2026) has investigated how reliably AI models can produce structured versus free-form outputs. Tam et al. [83] (EMNLP 2024) found a notable decline in LLM reasoning abilities when forced to generate content under format restrictions — but crucially, the degradation was in *reasoning within* structured formats, not in *mapping requirements to* them. Complementary work by Geng et al. [84] demonstrated that grammar-constrained decoding substantially outperforms unconstrained LLMs on structured NLP tasks like information extraction and entity disambiguation, particularly when training data is scarce — the grammar constraint compensates for the model's uncertainty about output format. The CRANE framework [85] (2025) reconciled these findings by alternating between unconstrained reasoning and constrained output: letting the model "think freely" then "write rigidly," achieving up to 10% accuracy improvements over baselines on symbolic reasoning benchmarks. Meanwhile, JSONSchemaBench [86] (2025) systematically evaluated six constrained decoding engines against 10,000 real-world JSON schemas, establishing that modern frameworks can reliably enforce complex schema conformance.

The emerging picture is that **AI models are fundamentally more reliable when translating intent into declarative configurations than when generating procedural logic**. An LLM excels at understanding "I need a sortable, filterable table of projects with status and priority columns" and producing a schema that captures those requirements; it is considerably less reliable at generating the imperative event handlers, state management, and DOM manipulation to implement that table from scratch. This asymmetry has practical implications: recent evaluations of LLM performance on real-world software engineering tasks (e.g., SWE-bench) show resolution rates that, while improving rapidly, remain well below human performance on complex multi-step imperative tasks [87]. The declarative approach converts the problem from "generate working code" to "generate a correct configuration" — a fundamentally more constrained and verifiable output space.

This is precisely why Vercel's **json-render** [81] (2025) and Google's **A2UI protocol** [14] (2025) both adopted schema-based architectures for AI-generated UI: the AI produces a declarative JSON specification constrained to a predefined catalog of components and actions, and a renderer interprets that specification into actual interface elements. The AI never touches imperative rendering code.

### The gap this report investigates

Given the advantages of the declarative approach, and the ecosystem of tools exploiting it, there is a conspicuous gap. All the declarative UI tools mentioned above address one of two concerns:

- **Data shape → form widgets** (RJSF, JSON Forms, AutoForm): "Here is the structure of a single record; generate a form to capture or display it."
- **Column configuration → table features** (TanStack Table, AG Grid): "Here are the columns; enable sorting, filtering, pagination."

But no single JavaScript/TypeScript library lets developers declare both the **data shape** and the **available operations** (sort, filter, edit, bulk delete, search, create) in a unified schema that a renderer consumes to generate a complete UI. There is no equivalent of saying:

> "I have a collection of `Project` objects, each with a `name` (string, editable, searchable), a `status` (enum, filterable), a `priority` (1–5, sortable), and `tags` (array, filterable by containment). The collection supports creation, bulk deletion, and export."

...and having a renderer automatically produce the appropriate table with sort controls, filter panels, inline editing, selection checkboxes, and action buttons — while a *different* renderer could produce a CLI, an API endpoint, or a mobile list view from the same declaration.

This report surveys and contrasts the existing tools in this space, identifies the specific gaps in the current JS/TS ecosystem, and points to the theoretical foundations — from HCI research, affordance theory, hypermedia architecture, and model-based UI development — that inform how such a unified "affordance schema" could be designed. It is intended for both human readers evaluating the landscape and an AI agent deciding on integration strategy for applications built with Zod, Zustand, Immer, and shadcn/ui.

---

## 1. The concept goes by many names across different communities

The core idea — declaratively specifying both data structure and available operations so a renderer can generate appropriate UI — spans at least four distinct communities, each with its own vocabulary.

**Model-Based User Interface Development (MBUID)** is the most established academic umbrella term, with over 30 years of research and a W3C working group [1][4]. MBUID decomposes UI development into layered models: task models describe what users need to accomplish, domain models capture data structure, abstract UI models specify interaction objects independent of any toolkit, concrete UI models bind to platform-specific widgets, and final UI is the running code [5]. The Cameleon Reference Framework [6] formalized these four layers and three transformation types (reification, abstraction, translation) in 2003.

**Schema-driven UI** is the practitioner's term in the JavaScript community, describing patterns where JSON Schema or similar declarations drive form and table generation at runtime [7][8]. Companies like Expedia Group [9] and Meshery [10] have documented this approach in production, with Meshery explicitly separating "nouns" (JSON Schema for data) from "verbs" (OpenAPI for operations).

**HATEOAS and hypermedia-driven UI** represent the API-side implementation. Roy Fielding explicitly connected hypermedia controls to affordance theory: "the information becomes the affordance through which the user obtains choices and selects actions" [3]. The Hydra Core Vocabulary [11] formalized this with `supportedOperation` and `supportedProperty` declarations on JSON-LD resources, while Siren [12] includes typed `actions` with method, href, and field definitions — the closest existing standard to "operation schemas." The concept is experiencing a renaissance as AI agents need machine-discoverable affordances [13].

**Generative UI** is the newest term (2024–2025), where Google's A2UI protocol [14] defines structured JSON specifications (data shape + component types) that renderers map to native widgets — architecturally identical to the core concept but driven by LLMs rather than static schemas.

Additional relevant terms include: **Abstract UI Models / Abstract Interaction Objects** (W3C-standardized widget abstractions) [4], **Interaction Flow Modeling Language (IFML)** (OMG standard for modeling user interactions declaratively) [15], **ConcurTaskTrees (CTT)** (task-modeling notation by Paternò) [16], **Capability-driven UI** (used in IoT, e.g., SmartThings capability schemas declaring both attributes and commands) [17], **CRUD scaffolding** (Django Admin, Rails scaffolding) [18], and **Metawidget** (the closest prior art — a UI widget that inspects both properties AND methods annotated as `@Action` to generate buttons alongside form fields) [19]. There is no single widely-adopted term that precisely captures "schema-based UI with declarative affordance/operation declarations" — a terminological gap reflecting the conceptual gap in existing tooling.

---

## 2. Existing JS/TS libraries: strong building blocks, missing integration layer

### Form generators: data shape only, no operations

**RJSF (react-jsonschema-form)** [20] is the baseline with **~15.5K GitHub stars**: pass a JSON Schema and an optional UI Schema, get a complete validated form. It supports multiple themes (MUI, Ant Design, Chakra UI, Semantic UI) via a widget registry pattern where `ui:widget` in the uiSchema overrides default widget selection. RJSF has no concept of collection operations, bulk actions, or CRUD lifecycle — it renders one record at a time. No native Zod or shadcn/ui support exists.

**JSON Forms** [21] (Eclipse-backed, **~2.6K stars**) takes a similar two-schema approach but separates concerns more cleanly with dedicated `VerticalLayout`, `HorizontalLayout`, `Control`, and `Categorization` elements in its UI Schema. It supports React, Angular, and Vue with a **tester-based renderer registry** where each renderer declares a priority function — the highest-scoring tester wins. This pattern is the most extensible approach to renderer-agnostic UI generation. Still, JSON Forms handles forms only.

**AutoForm** [22] (`@autoform/zod` + `@autoform/shadcn`) is the **best-in-class bridge between Zod and shadcn/ui**: pass a `ZodProvider(schema)` and get a complete form with automatically selected widgets (string → text input, enum → select, boolean → checkbox). It uses React Hook Form internally and supports per-field overrides via `fieldConfig`. However, it explicitly describes itself as for "internal and low-priority forms" and has **zero operation awareness** — no tables, no lists, no CRUD lifecycle.

**Formily** [23] (Alibaba, **~12.4K stars**) and **Uniforms** [24] (**~2K stars**, Meteor-heritage) round out the form-generator space. Formily offers a reactive form engine with JSON Schema-driven dynamic forms and a visual form designer, while Uniforms provides schema-agnostic form generation via bridge adapters. Neither handles collection operations.

### CRUD frameworks: operations exist but are imperative, not schema-driven

**React Admin** [25] (**~26.4K stars**, maintained by Marmelab) is the most mature CRUD framework. Its data provider interface defines **nine standardized methods**: `getList` (with sort, filter, pagination parameters), `getOne`, `getMany`, `getManyReference`, `create`, `update`, `updateMany`, `delete`, and `deleteMany`. Over **45 community adapters** exist for REST, GraphQL, Supabase, Firebase, Hasura, and more. The `<DataTable>` component (v5.7+) handles sortable columns, filterable fields, row selection, and bulk actions. However, React Admin is **component-driven, not schema-driven** — you build each view with JSX components like `<List>`, `<Edit>`, `<SimpleForm>`. "Guessers" (`ListGuesser`, `EditGuesser`) can auto-generate basic views from API responses, but these are development-time tools, not a declarative schema system. A new **Shadcn Admin Kit** [26] adapts React Admin for shadcn/ui + Tailwind but is still early.

**Refine** [27] (**~28K stars**) takes a headless approach: resources are declared as configuration objects with CRUD path mappings, and hooks like `useTable`, `useForm`, `useCreate`, `useUpdate`, `useDelete` provide state management without coupling to any UI library. This is **more declarative than React Admin** — resource configuration is data, not components — but you still must implement page components manually. Refine's "Inferencer" can auto-generate CRUD UIs by analyzing API responses, similar to React Admin's guessers. Its headless architecture means it works with any UI library including shadcn/ui.

**API Platform Admin** [28] (`@api-platform/admin`) is arguably the **closest existing implementation of the ideal**: one line of JSX (`<HydraAdmin entrypoint="https://api.example.com" />`) parses Hydra or OpenAPI documentation at runtime and auto-generates complete list/create/show/edit screens with appropriate input widgets, pagination, sorting, and filtering. Because Hydra describes `supportedOperation` per resource, the admin knows which CRUD operations are available. Built on React Admin, it demonstrates that **hypermedia affordance declarations can drive complete UI generation**.

### Generative UI frameworks: catalog + actions, but top-down composition

**json-render** [81] (Vercel Labs, 2025–2026, Apache-2.0) is the most architecturally relevant recent entry. It introduces a `defineCatalog()` that combines Zod-validated component prop schemas with named `actions` (each with parameter schemas and descriptions) into a single catalog object. A `defineRegistry()` maps catalog components to React implementations, and a `<Renderer>` consumes AI-generated JSON trees. The action system is particularly noteworthy: components emit typed events (`on.press`), specs bind events to named actions with parameters, confirmation dialogs, and success/error callbacks, and an `ActionProvider` dispatches to developer-implemented handlers — cleanly separating declarative intent from business logic. It also provides conditional visibility via logic expressions (`and`, `or`, `not` over data paths and auth state), data binding via `$state`/`$bindState` path expressions, built-in validation, and streaming JSONL rendering. A `@json-render/shadcn` package provides 36+ pre-built shadcn/ui component definitions. Cross-platform support spans React, React Native, Remotion (video), and React-PDF.

However, **json-render solves a different problem than affordance-driven UI generation**. Its flow is top-down: an AI (or developer) composes a tree of components from the catalog vocabulary. The catalog declares *what UI primitives exist and what props they accept*, not *what operations are available on data entities*. Its `Table` component is static (`columns: array, rows: array`) with no concept of sortable columns, filterable fields, or bulk operations. json-render constrains AI output to safe components; the vision in this report is to generate UI automatically from data shape + affordance declarations without requiring an AI composition step.

That said, json-render validates several key architectural patterns directly applicable to a custom affordance library: (1) Zod-native catalog definitions, (2) separation of component definition from component implementation via registry, (3) first-class action schemas with parameter validation, (4) cross-platform rendering from a single spec format, and (5) the catalog-as-system-prompt pattern where `generateCatalogPrompt()` auto-generates AI instructions from the schema. A comparison article [82] contrasts json-render's monolithic (app-owns-the-AI) approach with Google's A2UI protocol (agent-sends-UI-to-host), noting they target different architectural topologies.

### Collection operation libraries: declarative but rendering-only

**TanStack Table** [29] (**~26K stars**) provides the most declarative collection-operation model in the ecosystem. Column definitions specify per-column capabilities: `enableSorting`, `enableFiltering`, `filterFn`, `sortingFn`, plus a globally extensible `meta` property via TypeScript declaration merging. Features (sorting, filtering, pagination, row selection, column visibility, grouping, expanding) are declared as configuration on the table instance and enabled by providing the corresponding row model functions. Crucially, TanStack Table is **fully headless** — it provides state management and logic, you provide all rendering. shadcn/ui's `<DataTable>` component [30] is built on TanStack Table, making it the natural collection-rendering layer for Zod + shadcn stacks.

**AG Grid** [31] (**~15.1K stars**) takes the batteries-included approach: column definitions declare `sortable`, `editable`, `filter` (with specific filter types), and the grid renders everything including cell editing, batch editing (v34+), pagination, row selection, and export. It's the most feature-complete collection component but is tightly coupled to its own rendering system (not headless) and requires a paid Enterprise license ($999/dev/year) for advanced features.

### Headless CMS platforms: schema-to-admin done right, but platform-locked

**Payload CMS** [32] (**~38K stars**) is the best example of **code-first schema → admin UI generation**. Collections are defined in TypeScript config with fields, validation, conditional logic, access control, hooks, versioning, and admin display hints (`useAsTitle`, `defaultColumns`). The admin panel auto-generates list views with sortable columns, search, complex filters, and bulk operations — all from the schema. **Directus** [33] (**~29K stars**) achieves the same by introspecting existing SQL databases. **Strapi** [34] (**~70K stars**) and **KeystoneJS** [35] (**~9K stars**) follow similar patterns. These platforms demonstrate that the concept works in practice, but their schemas are proprietary and tied to their specific platforms.

### Hypermedia and HATEOAS client libraries

**Ketting** [36] is the most capable JS hypermedia client, supporting HAL, JSON:API, Siren, HTML, and HTTP Link headers with React bindings (`useResource`, `useCollection`). **@siren-js/client** [37] handles Siren's `actions` (name, method, href, fields, type) — the closest HTTP standard to operation schemas. **Alcaeus** [38] is a TypeScript Hydra client that discovers `supportedOperation` and `supportedProperty` from JSON-LD API documentation. **Kitsu** [39] handles JSON:API's filtering, sorting, pagination, and sparse fieldsets. None of these auto-generate UIs, but they provide the affordance-discovery layer that could feed a schema-driven renderer.

---

## 3. Library comparison across key dimensions

| Library | Data schema | Operation declarations | Collection ops | Item CRUD | Bulk ops | Renderer-agnostic | Zod + shadcn support | Maturity |
|---------|------------|----------------------|---------------|-----------|---------|-------------------|---------------------|---------|
| **RJSF** [20] | JSON Schema | ❌ | ❌ | Form only | ❌ | Via theme packages | ❌ | High (15.5K★) |
| **JSON Forms** [21] | JSON Schema + UI Schema | ❌ | ❌ | Form only | ❌ | ✅ Tester registry | ❌ | Medium (2.6K★) |
| **AutoForm** [22] | Zod native | ❌ | ❌ | Form only | ❌ | ✅ Multiple adapters | ✅ Native | Medium |
| **React Admin** [25] | Imperative components | ✅ DataProvider + Resource | ✅ Full | ✅ Full | ✅ Built-in | ❌ MUI-coupled | ⚠️ Shadcn kit emerging | High (26.4K★) |
| **Refine** [27] | Config objects | ✅ DataProvider + hooks | ✅ Via useTable | ✅ Via useForm | ✅ Via hooks | ✅ Headless | ✅ Works with any UI | High (28K★) |
| **API Platform Admin** [28] | Hydra/OpenAPI introspection | ✅ From API docs | ✅ Auto-generated | ✅ Auto-generated | ✅ | ❌ React Admin-coupled | ❌ | Medium |
| **json-render** [81] | Zod (component props) | ✅ Actions with params | ❌ Static Table only | ❌ No auto-CRUD | ❌ | ⚠️ Cross-platform but top-down | ✅ shadcn package | Early (32★, v0.5) |
| **TanStack Table** [29] | Column defs (config) | ✅ Sort/filter/paginate | ✅ Full | ❌ Read-only | ⚠️ Row selection | ✅ Fully headless | ✅ shadcn DataTable | High (26K★) |
| **AG Grid** [31] | Column defs (config) | ✅ Full including edit | ✅ Full | ✅ Cell/row edit | ✅ Batch edit | ❌ Own rendering | ❌ | High (15.1K★, commercial) |
| **Payload CMS** [32] | TypeScript collection config | ✅ Schema-driven | ✅ Auto-generated | ✅ Auto-generated | ✅ | ❌ Platform-locked | ❌ | High (38K★) |
| **Directus** [33] | DB introspection | ✅ Schema-driven | ✅ Auto-generated | ✅ Auto-generated | ✅ | ❌ Platform-locked | ❌ | High (29K★) |

---

## 4. The critical gap: no unified affordance schema exists in JS/TS

The ecosystem's fragmentation reveals three specific gaps that no existing library addresses:

**Gap 1: No library declares collection affordances alongside data shape in a single schema.** Form generators (RJSF, JSON Forms, AutoForm) handle data shape → form widgets. Collection libraries (TanStack Table, AG Grid) handle column definitions → table operations. But there is no unified schema where `sortable`, `filterable`, `searchable`, `bulkDeletable` sit alongside `z.string()`, `z.number()`, and `z.email()`. The closest is TanStack Table's column `meta` property, which allows arbitrary typed metadata per column via TypeScript declaration merging [40] — but this is a table-specific mechanism, not a general-purpose affordance schema.

**Gap 2: No renderer-agnostic affordance schema standard exists in the JS/TS ecosystem.** JSON Schema describes data shape. OpenAPI describes API operations. OData's Capabilities Vocabulary [41] describes per-property filterability, sortability, and CRUD restrictions — the most granular capability model among REST standards. Hydra [11] describes supported operations with expected inputs and outputs. But none of these has been adapted into a JS/TS-native, Zod-compatible, framework-agnostic affordance declaration format that renderers can consume.

**Gap 3: Existing CRUD frameworks don't achieve "Level 3" declarative affordances.** React Admin and Refine come closest, but their resource declarations are imperative (JSX components or hook composition), not data-driven schemas that a generic renderer interprets. API Platform Admin achieves the vision for Hydra APIs, but requires a Hydra-compliant backend — it can't work from a client-side Zod schema. The headless CMS platforms (Payload, Directus) achieve full schema-to-admin generation, but their schemas are proprietary and platform-locked. json-render [81] demonstrates that Zod-native catalogs with action schemas can work cross-platform, but its top-down composition model still requires an AI or developer to decide *which* components to use, rather than inferring them from data shape + affordance annotations.

---

## 5. Composing existing libraries toward the vision

Given the gap, the most pragmatic path is composing existing libraries with a thin affordance-declaration layer:

- **Zod** for data schema with **v4's `.meta()` system** [42] carrying affordance declarations (see Section 8)
- **TanStack Table** [29] for collection operations (sort, filter, paginate, select), consuming affordance metadata to auto-configure column capabilities
- **AutoForm** (`@autoform/shadcn`) [22] for item-level form generation from the same Zod schema
- **shadcn/ui DataTable** [30] + shadcn form components for rendering
- **TanStack Query** for data fetching with server-side sort/filter/pagination
- **Zustand + Immer** for local UI state (filter state, selection state, optimistic updates)
- A **custom affordance registry** that maps Zod schema metadata to both table column configurations and form field configurations

The key architectural insight is that **TanStack Table's column definition model is already an affordance schema for collections** — it just needs to be auto-generated from Zod metadata rather than hand-written. Similarly, AutoForm already generates forms from Zod schemas — it just needs to consume the same affordance metadata for field-level overrides (readonly, hidden, custom widget). The missing piece is a ~500-line glue layer that reads Zod `.meta()` annotations and produces both TanStack Table column definitions and AutoForm field configurations.

---

## 6. Theoretical foundations from HCI and software engineering

### The Cameleon framework defines the canonical abstraction layers

The **Cameleon Reference Framework** [6], published by Calvary, Coutaz, Vanderdonckt, and others in 2003, structures UI development into four levels: (1) **Task & Concepts** — user goals and domain objects, platform-independent; (2) **Abstract UI** — interaction objects like "input," "selection," "output," "navigation" without any widget commitment; (3) **Concrete UI** — platform-specific widgets (radio buttons vs. dropdowns) still in declarative form; (4) **Final UI** — running code. A Zod schema with affordance metadata maps to levels 1–2: the schema shapes define domain concepts, and the affordance annotations define abstract interaction requirements. A renderer consuming these annotations performs the 2→3→4 transformation.

### IFML models both data and interaction declaratively

The **Interaction Flow Modeling Language** [15], adopted as an OMG standard in 2013, uses ViewContainers (pages/windows), ViewComponents (lists, forms, details), Events, NavigationFlows, DataBindings, and Actions to model complete front-end behavior without implementation details. IFML is the closest formal standard to "declarative specification of both data shape AND operations" for UI. The book by Brambilla and Fraternali [43] demonstrates code generation from IFML models to multiple platforms, with WebRatio [44] and IFMLEdit.org providing tooling.

### ConcurTaskTrees capture the intent layer

**ConcurTaskTrees (CTT)** [16], introduced by Paternò in 1997, represent hierarchical task decompositions with temporal operators (enabling `>>`, concurrency `|||`, choice `[]`, interruption `[>`). Each task is classified as user, system, interaction, or abstract. CTT provides the "intent layer" — mapping user goals to required operations — that informs what affordances a schema must declare. The W3C published a CTT metamodel and XML schema [45] for interchange.

### Affordance theory grounds the concept in perception

Gibson's ecological affordance theory [2] (1979) defines affordances as action possibilities in the environment relative to the actor. Norman [46] adapted this to design, distinguishing real affordances from perceived affordances and later introducing "signifiers" — design elements that communicate what actions are possible. In a schema-driven UI, **operation declarations are affordances; the renderer's job is to generate appropriate signifiers** (buttons, sort icons, filter dropdowns) that make those affordances perceivable. Gaver's taxonomy [47] of perceptible, hidden, and false affordances maps directly to UI design challenges: a sortable column must be perceivably sortable (perceptible affordance), and a non-editable field must not appear editable (avoiding false affordance).

### HATEOAS connects affordances to REST architecture

Fielding's HATEOAS constraint [3] requires that clients discover available actions through hypermedia controls in responses. The Hydra Core Vocabulary [11] (Lanthaler & Gütl, 2013 [48]) operationalizes this with `supportedOperation` (HTTP method, expected type, returned type) and `supportedProperty` (readable, writable, required) on JSON-LD resources. **Siren** [12] goes further with explicit `actions` containing name, method, href, content type, and typed fields — essentially HTML forms in JSON. The **Schema.org Action vocabulary** [49] (since 2014) defines `potentialAction` on any `Thing` with `EntryPoint` (target URL, HTTP method) and `PropertyValueSpecification` (input constraints), making it the most widely deployed vocabulary for declaring potential operations on web resources.

### OData provides the most granular capability model

The **OData Capabilities Vocabulary** [41] (OASIS standard) annotates entity sets with `FilterRestrictions` (which properties are filterable), `SortRestrictions` (which are sortable, ascending-only), `InsertRestrictions`, `UpdateRestrictions`, `DeleteRestrictions`, `SearchRestrictions`, and `ExpandRestrictions`. This **per-property capability annotation** is the most detailed affordance schema among REST API standards and directly maps to what a collection-level affordance schema needs. Tools like Excel and Power BI consume OData metadata to auto-generate data browsing UIs [50].

### GraphQL introspection as capability schema

GraphQL's built-in `__schema` and `__type` queries [51] expose all types, fields, arguments, mutations, and subscriptions at runtime. This is a complete capability schema — tools like GraphiQL and Apollo Explorer auto-generate query builders and documentation from it. However, GraphQL introspection describes **available operations and signatures** without declaring constraints like "this field is filterable" or "this mutation supports bulk operations." Those are convention-dependent (e.g., Hasura's auto-generated `_bool_exp` filter types and `_order_by` sort types [52]).

### Relevant design patterns

The **Command pattern** models each operation declaration as a first-class object with execute/undo semantics — directly representing affordances as composable objects. The **Strategy pattern** enables different rendering strategies for different platforms, selected based on schema metadata (mapping to the Concrete UI selection in Cameleon). JSON Forms' **tester-based renderer registry** [21] implements the Strategy pattern: each renderer declares a priority function `(uiSchema, jsonSchema) → number`, and the highest-scoring tester wins. RJSF's **widget registry** [20] provides a simpler three-layer mapping (Fields → Widgets → Templates) that theme packages override. The **Interpreter pattern** applies directly: the schema is a language, and the UI engine interprets declarations to produce interfaces. The **headless component pattern** [53] (Radix UI, React Aria, TanStack) separates interaction logic from rendering — the architectural foundation for renderer-agnostic affordance processing.

---

## 7. Academic and peer-reviewed references

The academic landscape for this topic spans HCI, software engineering, and model-driven engineering. Key reference clusters include:

**Foundational MBUID works**: The W3C Model-Based UI XG Final Report [1] provides a comprehensive evaluation of research on model-based UIs, describing the Cameleon framework and standardization suggestions. Meixner et al.'s survey "Past, Present, and Future of Model-Based User Interface Development" [54] (i-com, 2011) traces the field's evolution. Gomaa and Salah's "Towards A Better Model-Based User Interface Development Environment: A Comprehensive Survey" [55] builds a comparison framework for MBUID techniques. A 2024 systematic literature review on user modeling in MDE [56] (arXiv:2412.15871) finds persistent gaps in unified user models that could drive adaptive code generation.

**IFML and web engineering**: Brambilla and Fraternali's "Interaction Flow Modeling Language" [43] (Morgan Kaufmann, 2015) is the definitive treatment, demonstrating integration with UML and BPMN plus code generation for web and mobile. Extensions for mobile development [57] target cross-platform HTML5/CSS/JS on Apache Cordova.

**Task modeling**: Paternò, Mancini, and Meniconi's foundational CTT paper [16] (INTERACT '97, 305+ citations) introduced the notation with temporal operators based on LOTOS. The W3C CTT specification [45] provides a metamodel and XML Schema for interchange. Paternò's extended treatment [58] covers integration with UML and multi-user task modeling.

**Cameleon and multi-target UIs**: Calvary et al.'s "A Unifying Reference Framework for Multi-Target User Interfaces" [6] (Interacting with Computers, 2003) defined the four-layer model and transformation types. The UsiXML language [59] (Limbourg, Vanderdonckt et al.) instantiated this framework as an XML-based UIDL supporting multi-directional development.

**Affordance theory**: Gibson's "The Ecological Approach to Visual Perception" [2] (1979) introduced affordances. Norman's "The Design of Everyday Things" [46] (1988/2013) adapted them to design. Gaver's "Technology Affordances" [47] (CHI '91) separated affordances from perceptual information. Hartson's taxonomy [60] (Behaviour & Information Technology, 2003) mapped cognitive, physical, sensory, and functional affordances to interaction design. Kaptelinin's encyclopedia entry [61] comprehensively reviews affordances in HCI.

**Hypermedia and affordances**: Fielding's dissertation [3] (2000) defined REST and HATEOAS. Lanthaler and Gütl's "Hydra: A Vocabulary for Hypermedia-Driven Web APIs" [48] (LDOW 2013) formalized operation and property descriptions for JSON-LD APIs. Recent work by Ciortea et al. on "Signifiers as a First-class Abstraction in Hypermedia Multi-Agent Systems" [62] (2024) extends affordance concepts to autonomous agents — directly relevant to AI agent integration.

**Modern UI generation**: TeleportHQ's UIDL [63] (ACM, 2020) defines a JSON-based, framework-agnostic UI description format with code generators for React, Vue, and Angular. Google's Generative UI paper [64] (Leviathan et al., 2025) and A2UI protocol [14] define structured specifications for agent-driven interface composition. Kennard and Leaney's "Towards a General Purpose Architecture for UI Generation" [19] (Journal of Systems and Software, 2010) describes Metawidget's pipeline of inspection → widget building → layout → rendering, the most complete prior art for affordance-driven UI generation.

**Structured generation and constrained decoding**: Tam et al.'s "Let Me Speak Freely?" [83] (EMNLP 2024) measured performance degradation under format restrictions. Geng et al.'s grammar-constrained decoding work [84] demonstrated accuracy improvements for structured NLP tasks. CRANE [85] (2025) showed that alternating free reasoning with constrained output yields the best results. JSONSchemaBench [86] (2025) established a large-scale evaluation framework for constrained decoding engines against real-world schemas.

---

## 8. Design considerations for building a custom affordance schema library

### Schema foundation: Zod v4 metadata is the right carrier

Zod v4 introduces a **metadata and registry system** [42] purpose-built for this use case. The `.meta()` method attaches arbitrary typed metadata to any schema instance. The `z.globalRegistry` provides a `GlobalMeta` interface extensible via TypeScript declaration merging:

```typescript
declare module "zod" {
  interface GlobalMeta {
    affordances?: {
      sortable?: boolean;
      filterable?: boolean | { type: 'text' | 'select' | 'range' };
      searchable?: boolean;
      editable?: boolean;
      hidden?: boolean;
      widget?: string;
    };
    operations?: Array<{
      name: string;
      type: 'item' | 'collection' | 'bulk';
      handler?: string;
      confirm?: boolean;
    }>;
  }
}
```

Custom registries via `z.registry<MetaType>()` enable separate metadata scopes (UI metadata vs. API metadata vs. access control). Metadata from `z.globalRegistry` flows automatically into `z.toJSONSchema()` output [42], enabling interoperability with JSON Schema-based tools.

### Operation representation should follow OData's capability model

The **OData Capabilities Vocabulary** [41] provides the most battle-tested model for per-field capability annotations. Adapting its approach to TypeScript: fields default to their maximum capability set (sortable, filterable, readable) unless explicitly restricted. This follows the **convention-over-configuration** principle — declare exceptions, not norms. Collection-level operations (search, bulk delete, create, export) should be declared separately from field-level capabilities, following Hydra's pattern of `supportedOperation` at the resource level [11].

### Renderer-agnosticism through a tester-based registry

JSON Forms' tester-based renderer registry [21] is the proven pattern: define `(schema, metadata) → priority` functions that map schema types plus affordance metadata to specific components. A shadcn/ui renderer set implements `{ StringField: Input, EnumField: Select, BooleanField: Checkbox, ... }` while an alternative MUI renderer set provides its own implementations. The registry should be hierarchical: a base layer handles standard types, project-specific layers override for custom widgets.

### State management: auto-generate Zustand slices from schema

A factory function can produce typed Zustand stores from affordance schemas:

```typescript
function createCollectionStore<T extends z.ZodObject>(schema: T) {
  type Entity = z.infer<T>;
  return create<CollectionState<Entity>>()(immer((set) => ({
    items: [],
    sorting: [],
    filters: {},
    selection: new Set<string>(),
    // Auto-generated actions from schema affordances
    ...generateActions(schema, set),
  })));
}
```

Each declared operation generates a corresponding Immer producer [65]. Zustand's middleware architecture supports Immer natively via `zustand/middleware/immer`, and the auto-generating-selectors pattern [66] creates typed selectors from store shape programmatically.

### TypeScript type inference makes it safe end-to-end

Template literal types generate operation names from schema keys: `type CRUDOps<T extends string> = \`create${Capitalize<T>}\` | \`update${Capitalize<T>}\` | ...` [67]. Conditional types infer widget types from Zod schema types: `type InferWidget<T> = T extends z.ZodString ? 'TextInput' : T extends z.ZodEnum<any> ? 'Select' : ...`. TanStack Table's declaration merging pattern [40] (`declare module '@tanstack/react-table' { interface ColumnMeta<TData, TValue> { ... } }`) demonstrates how to extend third-party type systems with affordance metadata.

### Handling async operations and server-side processing

For server-side sort/filter/pagination, the affordance schema should declare `{ server: true }` on capabilities, causing the generated table to delegate to TanStack Table's `manualSorting`, `manualFiltering`, and `manualPagination` modes [29] backed by TanStack Query fetchers. The data provider pattern from React Admin [25] and Refine [27] — a normalized interface with `getList(resource, { sort, filter, pagination })` — provides the proven abstraction for server-side operations.

### Lessons from 30 years of MBUID research

The MBUID literature consistently identifies three failure modes to avoid: (1) **over-abstraction** — making the schema so abstract it's harder to write than the UI itself (UsiXML and UIML suffered from this [59]); (2) **insufficient escape hatches** — schema-driven systems must allow dropping to imperative code for 20% of cases that don't fit patterns; (3) **ignoring the "last mile"** — auto-generated UIs must look professional, not obviously generated [19]. Metawidget's pluggable pipeline architecture (inspectors → widget builders → layouts → widgets) [19] provides the most practical model, where each stage is independently overridable.

---

## Conclusion: a tractable path exists

The concept of schema-based UI with declarative affordance declarations is theoretically mature — the Cameleon framework, IFML, Hydra, and OData Capabilities Vocabulary have independently solved pieces of the problem over two decades. **The JS/TS ecosystem gap is not conceptual but compositional**: Zod v4's metadata system can carry affordance declarations, TanStack Table can consume them for collections, AutoForm can consume them for forms, and a tester-based renderer registry can wire everything to shadcn/ui components.

The most efficient path forward is not building a monolithic framework but building a **thin affordance-declaration layer** (~500–1000 lines) on top of Zod v4 metadata that produces configuration objects for existing renderers. This follows the headless UI philosophy: declare once (schema + affordances), render anywhere (shadcn, MUI, or custom). The OData Capabilities Vocabulary provides the most detailed model for per-field capability annotations, Hydra provides the model for resource-level operation declarations, and JSON Forms' tester registry provides the renderer-agnostic dispatch mechanism.

Three novel insights emerge from this research: First, **HATEOAS is experiencing a revival through AI agents** [13] — the same affordance-discovery mechanisms designed for REST clients are exactly what LLM-powered agents need, making an affordance schema library immediately useful for both human UI and agent integration. Second, **Google's A2UI protocol** [14] and **Vercel's json-render** [81] validate the core architecture from complementary directions — major industry investment confirms the approach. Third, the **Metawidget project** [19] (2010) solved this problem in Java with a pipeline that inspects both data shape and annotated methods; its architecture deserves study as the most complete prior art.

---

## References

[1] W3C Model-Based UI XG, "Model-Based UI XG Final Report," W3C, 2010. https://www.w3.org/2007/uwa/editors-drafts/mbui/latest/Model-Based-UI-XG-FinalReport.html

[2] J. J. Gibson, *The Ecological Approach to Visual Perception*. Houghton Mifflin, 1979. Reissued by Psychology Press, 2014.

[3] R. T. Fielding, "Architectural Styles and the Design of Network-based Software Architectures," Ph.D. dissertation, Univ. of California, Irvine, 2000. https://www.ics.uci.edu/~fielding/pubs/dissertation/top.htm

[4] W3C, "Introduction to Model-Based UI," W3C Working Draft. https://www.w3.org/TR/mbui-intro/

[5] W3C, "Cameleon Reference Framework," W3C Community Wiki. https://www.w3.org/community/uad/wiki/Cameleon_Reference_Framework

[6] G. Calvary, J. Coutaz, D. Thevenin, Q. Limbourg, L. Bouillon, and J. Vanderdonckt, "A Unifying Reference Framework for Multi-Target User Interfaces," *Interacting with Computers*, vol. 15, no. 3, pp. 289–308, 2003. https://doi.org/10.1016/S0953-5438(03)00010-9

[7] S. Tripurari, "Understanding Schema Driven UI," Medium, 2024. https://medium.com/@shivanitripurari07/understanding-schema-driven-ui-d627cc4fd263

[8] No Clocks, LLC, "Schema-Driven Development and Single Source of Truth," 2024. https://blog.noclocks.dev/schema-driven-development-and-single-source-of-truth-essential-practices-for-modern-developers

[9] Jamil-Mir, "Schema Driven UIs," Expedia Group Tech Blog. https://medium.com/expedia-group-tech/schema-driven-uis-dd8fdb516120

[10] Meshery, "Schema-Driven UI Development," Meshery Documentation. https://docs.meshery.io/project/contributing/contributing-ui-schemas

[11] Hydra W3C Community Group, "Hydra Core Vocabulary," W3C Community Group Draft. https://www.hydra-cg.com/spec/latest/core/

[12] K. Swiber, "Siren: A Hypermedia Specification for Representing Entities," 2012. https://github.com/kevinswiber/siren

[13] Nordic APIs, "HATEOAS: The API Design Style That Was Waiting for AI," 2025. https://nordicapis.com/hateoas-the-api-design-style-that-was-waiting-for-ai/

[14] Google Developers Blog, "Introducing A2UI: An Open Project for Agent-Driven Interfaces," 2025. https://developers.googleblog.com/introducing-a2ui-an-open-project-for-agent-driven-interfaces/

[15] OMG, "Interaction Flow Modeling Language (IFML) 1.0," Object Management Group, 2015. https://www.ifml.org/

[16] F. Paternò, C. Mancini, and S. Meniconi, "ConcurTaskTrees: A Diagrammatic Notation for Specifying Task Models," in *INTERACT '97*, Springer, 1997. https://doi.org/10.1007/978-0-387-35175-9_58

[17] SmartThings Community, "Capability Schema Documentation." https://community.smartthings.com/t/capability-schema-documentation/241530

[18] Django Software Foundation, "The Django Admin Site." https://docs.djangoproject.com/en/stable/ref/contrib/admin/

[19] R. Kennard and J. Leaney, "Towards a General Purpose Architecture for UI Generation," *Journal of Systems and Software*, vol. 83, no. 10, 2010.

[20] RJSF Team, "react-jsonschema-form." https://rjsf-team.github.io/react-jsonschema-form/ | GitHub: https://github.com/rjsf-team/react-jsonschema-form

[21] EclipseSource, "JSON Forms." https://jsonforms.io/ | GitHub: https://github.com/eclipsesource/jsonforms

[22] vantezzen, "AutoForm." https://autoform.vantezzen.io/ | GitHub: https://github.com/vantezzen/autoform

[23] Alibaba, "Formily." https://formilyjs.org/ | GitHub: https://github.com/alibaba/formily

[24] Vazco, "Uniforms." https://uniforms.tools/ | GitHub: https://github.com/vazco/uniforms

[25] Marmelab, "React Admin." https://marmelab.com/react-admin/ | GitHub: https://github.com/marmelab/react-admin

[26] Marmelab, "Shadcn Admin Kit." https://github.com/marmelab/shadcn-admin-kit

[27] Refine Dev, "Refine." https://refine.dev/ | GitHub: https://github.com/refinedev/refine

[28] API Platform, "API Platform Admin." https://api-platform.com/docs/admin/ | GitHub: https://github.com/api-platform/admin

[29] TanStack, "TanStack Table." https://tanstack.com/table | GitHub: https://github.com/TanStack/table

[30] shadcn/ui, "Data Table." https://ui.shadcn.com/docs/components/data-table

[31] AG Grid, "AG Grid." https://www.ag-grid.com/ | GitHub: https://github.com/ag-grid/ag-grid

[32] Payload CMS, "Payload." https://payloadcms.com/ | GitHub: https://github.com/payloadcms/payload

[33] Directus, "Directus." https://directus.io/ | GitHub: https://github.com/directus/directus

[34] Strapi, "Strapi." https://strapi.io/ | GitHub: https://github.com/strapi/strapi

[35] KeystoneJS, "Keystone." https://keystonejs.com/ | GitHub: https://github.com/keystonejs/keystone

[36] Bad Gateway, "Ketting." https://github.com/badgateway/ketting

[37] Siren.js, "@siren-js/client." https://github.com/siren-js/client

[38] Wikibus, "Alcaeus (Hydra Client)." https://github.com/wikibus/Alcaeus

[39] Wopian, "Kitsu (JSON:API Client)." https://github.com/wopian/kitsu

[40] TanStack, "TanStack Table Column Definitions." https://tanstack.com/table/v8/docs/api/core/column-def

[41] OASIS, "OData Capabilities Vocabulary." https://github.com/oasis-tcs/odata-vocabularies/blob/main/vocabularies/Org.OData.Capabilities.V1.md | Blog: https://www.odata.org/blog/introducing-a-capabilities-vocabulary/

[42] Zod, "Metadata." https://zod.dev/metadata

[43] M. Brambilla and P. Fraternali, *Interaction Flow Modeling Language: Model-Driven UI Engineering of Web and Mobile Apps with IFML*. Morgan Kaufmann, 2015. https://www.sciencedirect.com/book/9780128001080/interaction-flow-modeling-language

[44] WebRatio, "WebRatio Platform." https://www.webratio.com/

[45] W3C, "ConcurTaskTrees." https://www.w3.org/2012/02/ctt/

[46] D. A. Norman, *The Design of Everyday Things*, Revised ed. Basic Books, 2013.

[47] W. W. Gaver, "Technology Affordances," in *Proc. CHI '91*, ACM, 1991.

[48] M. Lanthaler and C. Gütl, "Hydra: A Vocabulary for Hypermedia-Driven Web APIs," in *Proc. LDOW 2013 at WWW2013*, Rio de Janeiro, 2013. http://www.markus-lanthaler.com/hydra/

[49] Schema.org, "Actions." https://schema.org/docs/actions.html

[50] OData.org, "ODataQueryBuilder." https://www.odata.org/blog/odataquerybuilder-a-cross-browser-javascript-library-for-building-odata-queries-3/

[51] GraphQL Foundation, "Introspection," GraphQL Specification. https://graphql.org/learn/introspection/

[52] Hasura, "Hasura GraphQL Engine." https://hasura.io/

[53] M. Fowler, "Headless Component: A Pattern for Composing React UIs," martinfowler.com. https://martinfowler.com/articles/headless-component.html

[54] G. Meixner, F. Paternò, and J. Vanderdonckt, "Past, Present, and Future of Model-Based User Interface Development," *i-com*, vol. 10, no. 3, 2011. https://www.researchgate.net/publication/220584891_Past_Present_and_Future_of_Model-Based_User_Interface_Development

[55] H. Gomaa and A. Salah, "Towards A Better Model-Based User Interface Development Environment: A Comprehensive Survey." https://www.semanticscholar.org/paper/Towards-A-Better-Model-Based-User-Interface-:-A-Gomaa-Salah/6a3564cb9fc13e11ed499be699f26aca14e488c8

[56] "User Modeling in Model-Driven Engineering: A Systematic Literature Review," arXiv:2412.15871, 2024. https://arxiv.org/html/2412.15871v1

[57] M. Brambilla, A. Mauri, and E. Umuhoza, "Extending the Interaction Flow Modeling Language (IFML) for Model Driven Development of Mobile Applications Front End." https://www.ifml.org/

[58] F. Paternò, "ConcurTaskTrees: An Engineered Approach to Model-Based Design of Interactive Systems," HIIS Lab, ISTI-CNR. http://giove.isti.cnr.it/AssetsSitoLab/publications/2003-A1-07.pdf

[59] Q. Limbourg, J. Vanderdonckt, et al., "USIXML: A User Interface Description Language." http://www.usixml.org/

[60] R. Hartson, "Cognitive, Physical, Sensory, and Functional Affordances in Interaction Design," *Behaviour & Information Technology*, 2003.

[61] V. Kaptelinin, "Affordances and Design," in *Encyclopedia of Human-Computer Interaction*, 2nd ed. https://www.interaction-design.org/literature/book/the-encyclopedia-of-human-computer-interaction-2nd-ed/affordances

[62] A. Ciortea et al., "Signifiers as a First-class Abstraction in Hypermedia Multi-Agent Systems," 2024. https://link.springer.com/content/pdf/10.1007/s10472-024-09938-6.pdf

[63] TeleportHQ, "UIDL: User Interface Definition Language," ACM, 2020. https://docs.teleporthq.io/uidl/ | https://dl.acm.org/doi/10.1145/3397874

[64] Google Research, "Generative UI: A Rich Custom Visual Interactive User Experience for Any Prompt," 2025. https://generativeui.github.io/static/pdfs/paper.pdf | Blog: https://research.google/blog/generative-ui-a-rich-custom-visual-interactive-user-experience-for-any-prompt/

[65] Immer, "Using Immer with Zustand." https://zustand.docs.pmnd.rs/guides/updating-state#with-immer

[66] Zustand, "Auto-Generating Selectors." https://zustand.docs.pmnd.rs/guides/auto-generating-selectors

[67] TypeScript, "Template Literal Types." https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html

[68] A. Harri, "Build Your Own Schema Language with TypeScript's Infer Keyword." https://alexharri.com/blog/build-schema-language-with-infer

[69] M. Kelly, "HAL — Hypertext Application Language," IETF Internet-Draft, draft-kelly-json-hal-11, 2023. https://www.ietf.org/archive/id/draft-kelly-json-hal-11.html

[70] JSON:API Specification. https://jsonapi.org/

[71] TkDodo, "Working with Zustand." https://tkdodo.eu/blog/working-with-zustand

[72] Vercel, "AI SDK Generative User Interfaces." https://ai-sdk.dev/docs/ai-sdk-ui/generative-user-interfaces

[73] CopilotKit, "Generative UI." https://www.copilotkit.ai/generative-ui

[74] M. H. Miraz et al., "Adaptive User Interfaces and Universal Usability through Plasticity of User Interface Design," *Computer Science Review*, 2021. https://dl.acm.org/doi/10.1016/j.cosrev.2021.100363

[75] S. Brdnik et al., "Intelligent User Interfaces and Their Evaluation: A Systematic Mapping Study," *Sensors*, 2022. https://pmc.ncbi.nlm.nih.gov/articles/PMC9370954/

[76] Evolutility, "Evolutility UI React." https://github.com/evoluteur/evolutility-ui-react

[77] MUI, "Toolpad CRUD Component." https://mui.com/toolpad/core/react-crud/

[78] Nordic APIs, "Hydra for Hypermedia APIs: Benefits, Components, and Examples." https://nordicapis.com/hydra-for-hypermedia-apis-benefits-components-and-examples/

[79] JSON Schema Specification, "Custom Annotations and Vocabularies." https://json-schema.org/understanding-json-schema/reference/schema

[80] Spring, "Building Richer Hypermedia with Spring HATEOAS." https://spring.io/blog/2018/01/12/building-richer-hypermedia-with-spring-hateoas/

[81] Vercel Labs, "json-render: The Generative UI Framework." https://json-render.dev/ | GitHub: https://github.com/vercel-labs/json-render

[82] D. Metia, "Vercel's json-render vs. Google's A2UI: The Head-to-Head," Medium, Jan. 2026. https://dipjyotimetia.medium.com/vercels-json-render-vs-google-s-a2ui-the-head-to-head-6f213cf1a23b

[83] Z. R. Tam, C.-K. Wu, Y.-L. Tsai, C.-Y. Lin, H.-y. Lee, and Y.-N. Chen, "Let Me Speak Freely? A Study on the Impact of Format Restrictions on Performance of Large Language Models," in *Proc. EMNLP Industry Track*, Miami, FL, 2024. https://arxiv.org/abs/2408.02442

[84] S. Geng, M. Josifoski, M. Peyrard, and R. West, "Grammar-Constrained Decoding for Structured NLP Tasks without Finetuning," arXiv:2305.13971, 2023 (revised Jan 2024). https://arxiv.org/abs/2305.13971

[85] S. Ugare et al., "CRANE: Reasoning with Constrained LLM Generation," arXiv:2502.09061, 2025. https://arxiv.org/abs/2502.09061

[86] Guidance AI et al., "Generating Structured Outputs from Language Models: Benchmark and Studies (JSONSchemaBench)," arXiv:2501.10868, Jan 2025. https://arxiv.org/abs/2501.10868

[87] C. E. Jimenez et al., "SWE-bench: Can Language Models Resolve Real-World GitHub Issues?" arXiv:2310.06770, 2023 (ICLR 2024). https://arxiv.org/abs/2310.06770
