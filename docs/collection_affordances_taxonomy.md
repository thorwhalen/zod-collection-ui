# Exhaustive Taxonomy of Collection Affordances

This document enumerates every "affordance" (action, capability, control, operation) that a user or system might want to perform on a **collection of objects**. The goal is completeness — this is the universe of possibilities that a collection affordance schema must be able to declare.

We organize by level: **Item-level** (acts on one item), **Selection-level** (acts on a chosen subset), **Collection-level** (acts on the collection as a whole), and **Field-level** (declares capabilities of individual fields/properties within items). There's also a **View/Presentation** level for affordances that change how the collection is displayed without mutating data.

---

## 1. FIELD-LEVEL AFFORDANCES (per-property capabilities)

These declare what operations are meaningful on each field of an item. They inform both renderers (what controls to show) and the data layer (what queries to support).

### 1.1 Sorting
- **`sortable`**: This field can be used to order items.
  - `sortDirections`: Which directions are supported? `['asc', 'desc']` or `['asc']` only.
  - `sortFn`: Custom sort function (e.g., natural sort for version strings, locale-aware for names).
  - `nullsFirst` / `nullsLast`: Where nulls/undefined sort to.
  - `defaultSort`: Is this field the default sort? With what direction?
  - `serverSort`: Sorting must be delegated to the server (vs. client-side).

### 1.2 Filtering
- **`filterable`**: This field can be used to narrow the collection.
  - `filterType`: What kind of filter UI is appropriate?
    - `text` — free-text substring/regex matching
    - `exact` — exact value match (typically for IDs)
    - `select` — choose from enumerated values (dropdown)
    - `multiSelect` — choose multiple values (checkbox list, tag picker)
    - `range` — numeric/date range (min/max sliders, date pickers)
    - `boolean` — true/false toggle
    - `contains` — array containment (for array-valued fields: "tags contain X")
    - `fuzzy` — fuzzy matching (Levenshtein, trigram)
    - `faceted` — faceted search with counts
  - `filterOptions`: Explicit enum of allowed values (or function to compute them from data).
  - `filterFn`: Custom filter function.
  - `serverFilter`: Filtering must be delegated to the server.
  - `defaultFilter`: This field has a pre-applied filter on load.

### 1.3 Searching
- **`searchable`**: This field is included in full-text search across the collection.
  - `searchWeight`: Relative importance in search ranking (e.g., title > description > tags).
  - `searchAnalyzer`: How to tokenize/normalize for search (lowercase, stemming, etc.).

### 1.4 Grouping
- **`groupable`**: Items can be grouped by this field's values.
  - `groupFn`: Custom grouping function (e.g., "group by first letter", "group by date range").
  - `groupLabel`: How to label each group (e.g., format a date as "January 2025").

### 1.5 Aggregation
- **`aggregatable`**: This field supports aggregate computations.
  - `aggregationFns`: Which aggregations? `['sum', 'avg', 'min', 'max', 'count', 'median', 'mode', 'stddev']`.
  - `showAggregateInFooter`: Show the aggregate value in a table footer.
  - `showAggregateInGroupHeader`: Show per-group aggregates.

### 1.6 Editability
- **`editable`**: This field can be modified by the user.
  - `editWidget`: Override the default edit widget (e.g., rich text editor vs. plain textarea).
  - `editValidation`: Additional validation rules for editing (beyond the Zod schema's built-in validation).
  - `inlineEditable`: Can be edited directly in the collection view (e.g., click-to-edit in a table cell) vs. requiring an edit form.
  - `bulkEditable`: Can be set to the same value across multiple selected items.
  - `editPermission`: Who can edit (role-based, ownership-based).
  - `editConfirm`: Require confirmation before saving edits.
  - `editHistory`: Track edit history for this field.

### 1.7 Visibility & Layout
- **`visible`**: Whether this field appears in the collection view by default.
  - `hideable`: Can the user toggle this field's visibility?
  - `alwaysVisible`: This field cannot be hidden (e.g., the primary identifier).
  - `detailOnly`: Only shown in detail/edit view, never in the list/table view.
  - `summaryField`: This field appears in compact/summary views.
  - `defaultWidth`: Default column width in table views.
  - `resizable`: Can the user resize this column?
  - `pinnable`: Can be pinned to left/right in a table.
  - `pinnedPosition`: Default pinned position (`'left'`, `'right'`, `null`).

### 1.8 Display
- **`displayFormat`**: How to render the raw value for display.
  - `formatter`: Function or format string (e.g., `"$0,0.00"` for currency, `"MMM DD, YYYY"` for dates).
  - `cellRenderer`: Custom React component for rendering this field in a table cell.
  - `truncate`: Max character length before truncation.
  - `tooltip`: Show full value on hover if truncated.
  - `link`: Render as a clickable link (with URL template).
  - `badge`: Render as a badge/chip (with color mapping).
  - `image`: Render as an image/thumbnail.
  - `copyable`: Show a copy-to-clipboard button.
  - `icon`: Map values to icons.

### 1.9 Ordering (column/field order)
- **`reorderable`**: Can the user drag this field/column to a different position?
- **`order`**: Default position in the field/column order.

---

## 2. ITEM-LEVEL AFFORDANCES (operations on a single item)

### 2.1 Core CRUD
- **`create`**: Add a new item to the collection.
  - `createForm`: Schema or component for the creation form.
  - `createDefaults`: Default values for new items.
  - `createFromTemplate`: Create by cloning a template.
  - `createPermission`: Who can create.
  - `createValidation`: Additional creation-time validation.
  - `quickCreate`: Streamlined inline creation (e.g., "add row" in a table).

- **`read`** / **`view`**: View item details.
  - `detailView`: How to render the detail view (layout, which fields to show).
  - `expandInline`: Can view details inline (expand row) vs. navigating away.
  - `previewOnHover`: Show a preview popup on hover.

- **`update`** / **`edit`**: Modify an existing item.
  - `editForm`: Schema or component for the edit form.
  - `editableFields`: Which fields are editable (may differ by role/state).
  - `editMode`: `'form'` (separate page/dialog), `'inline'` (in-place in the list), `'modal'` (dialog overlay).
  - `partialUpdate`: Support patching individual fields vs. full replacement.
  - `optimisticUpdate`: Apply changes immediately, rollback on failure.
  - `autosave`: Save edits automatically after a delay.

- **`delete`** / **`remove`**: Remove an item from the collection.
  - `deleteConfirm`: Require confirmation? With what message?
  - `softDelete`: Mark as deleted but don't remove (trash/archive).
  - `deletePermission`: Who can delete.
  - `cascadeDelete`: What related items are affected.

### 2.2 Duplication & Templating
- **`duplicate`** / **`clone`**: Create a copy of an item.
  - `duplicateFields`: Which fields to copy (some may be excluded, like IDs or timestamps).
  - `duplicateSuffix`: How to name the copy (e.g., append " (copy)").

- **`saveAsTemplate`**: Save item configuration as a reusable template.

### 2.3 State Transitions
- **`archive`**: Move to an archived state (soft removal from active collection).
- **`restore`**: Bring back from archived/deleted state.
- **`publish`** / **`unpublish`**: Toggle public visibility.
- **`lock`** / **`unlock`**: Prevent/allow further edits.
- **`approve`** / **`reject`**: Workflow state transitions.
- **`activate`** / **`deactivate`**: Toggle active/inactive status.

### 2.4 Navigation & Context
- **`navigate`**: Click/tap to navigate to a detail page.
  - `navigateUrl`: URL template for the detail page.
- **`select`**: Toggle selection of this item (for bulk operations).
  - `selectable`: Whether this item can be selected.
- **`expand`** / **`collapse`**: Show/hide nested content (sub-rows, details panel).
- **`drag`**: Begin a drag operation (for reordering, moving between groups/containers).
  - `draggable`: Whether this item is draggable.
  - `dragHandle`: Show a drag handle.
- **`contextMenu`**: Right-click menu with available actions.

### 2.5 Annotation & Metadata
- **`tag`**: Add/remove tags to an item.
- **`label`**: Add/remove labels (similar to tags but often with colors).
- **`comment`** / **`annotate`**: Add a comment or annotation.
- **`rate`** / **`score`**: Assign a rating or score.
- **`flag`** / **`bookmark`** / **`star`** / **`favorite`**: Mark for attention.
- **`assignTo`**: Assign to a user/team.
- **`prioritize`**: Set priority level.
- **`categorize`**: Assign to a category.

### 2.6 Sharing & Permissions
- **`share`**: Share with other users/groups.
- **`setPermissions`**: Change access control.
- **`transfer`**: Transfer ownership.
- **`makePublic`** / **`makePrivate`**: Toggle visibility scope.

### 2.7 History & Versioning
- **`viewHistory`**: See change history for this item.
- **`revert`**: Roll back to a previous version.
- **`compare`**: Compare two versions.
- **`snapshot`**: Save the current state as a named version.

### 2.8 Relationships
- **`link`** / **`associate`**: Create a relationship to another item (same or different collection).
- **`unlink`** / **`disassociate`**: Remove a relationship.
- **`moveToCollection`**: Transfer item to a different collection or sub-collection.
- **`mergeWith`**: Merge two items into one (deduplicate).

---

## 3. SELECTION-LEVEL AFFORDANCES (bulk/batch operations on selected items)

These require a selection mechanism and operate on the current selection.

### 3.1 Bulk CRUD
- **`bulkEdit`**: Edit the same field(s) across all selected items.
  - `bulkEditableFields`: Which fields can be bulk-edited.
- **`bulkDelete`**: Delete all selected items.
  - `bulkDeleteConfirm`: Require confirmation with count.
- **`bulkDuplicate`**: Duplicate all selected items.

### 3.2 Bulk State Transitions
- **`bulkArchive`**: Archive all selected.
- **`bulkPublish`** / **`bulkUnpublish`**: Toggle publish state for selection.
- **`bulkActivate`** / **`bulkDeactivate`**: Toggle active state.
- **`bulkApprove`** / **`bulkReject`**: Workflow transitions.

### 3.3 Bulk Annotation
- **`bulkTag`**: Add/remove tags from all selected.
- **`bulkLabel`**: Add/remove labels.
- **`bulkAssign`**: Assign all selected to a user/team.
- **`bulkPrioritize`**: Set priority for all selected.
- **`bulkCategorize`**: Set category.

### 3.4 Bulk Organization
- **`bulkMove`**: Move selected items to a different group/folder/collection.
- **`bulkMerge`**: Merge selected items into one.
- **`bulkReorder`**: Reorder selected items relative to each other.

### 3.5 Selection Management
- **`selectAll`**: Select all items (in current view or entire collection).
- **`selectNone`**: Clear selection.
- **`selectInverse`**: Invert selection.
- **`selectByFilter`**: Select all items matching a filter.
- **`selectionCount`**: Display count of selected items.
- **`selectionSummary`**: Show aggregate info about selected items (total, avg, etc.).

---

## 4. COLLECTION-LEVEL AFFORDANCES (operate on the collection as a whole)

### 4.1 Search & Discovery
- **`search`**: Full-text search across all searchable fields.
  - `searchDebounce`: Debounce delay for search input.
  - `searchMinChars`: Minimum characters before search activates.
  - `searchHighlight`: Highlight matching text in results.
  - `searchSuggestions`: Show autocomplete suggestions.
  - `savedSearches`: Allow saving and recalling search queries.

- **`globalFilter`**: A single filter that applies across multiple fields.
- **`advancedSearch`**: Multi-field search with boolean operators (AND/OR/NOT).

### 4.2 Sorting (collection-level control)
- **`multiSort`**: Sort by multiple fields simultaneously (e.g., "sort by status then by date").
  - `maxSortColumns`: Maximum number of simultaneous sort columns.
- **`savedSorts`**: Save and recall sort configurations.
- **`resetSort`**: Return to default sort order.

### 4.3 Filtering (collection-level control)
- **`filterPanel`**: Show/hide a filter panel or sidebar.
- **`activeFilterDisplay`**: Show currently active filters as removable chips.
- **`clearAllFilters`**: Remove all active filters.
- **`savedFilters`**: Save and recall filter configurations.
- **`filterPresets`**: Pre-defined filter configurations (e.g., "My Items", "Overdue", "High Priority").
- **`compoundFilter`**: Combine filters with AND/OR logic (query builder).

### 4.4 Pagination
- **`paginate`**: Split the collection into pages.
  - `pageSize`: Items per page.
  - `pageSizeOptions`: Allowed page sizes (e.g., [10, 25, 50, 100]).
  - `paginationStyle`: `'pages'` (page numbers), `'loadMore'` (button), `'infinite'` (scroll), `'cursor'` (API cursor).
  - `totalCount`: Show total item count.
  - `serverPagination`: Pagination delegated to server.

### 4.5 Grouping (collection-level control)
- **`groupBy`**: Group items by a field's values.
  - `nestedGrouping`: Group within groups (multi-level).
  - `groupCollapsible`: Can individual groups be collapsed?
  - `groupDefaultState`: Start collapsed or expanded.
  - `groupAggregates`: Show per-group aggregates.
  - `groupSortable`: Can the order of groups be changed?
  - `groupRenameable`: Can group labels be renamed?

### 4.6 View Modes
- **`viewMode`**: Switch between display modes.
  - `table` — rows and columns (data grid).
  - `list` — vertical list of cards/items.
  - `grid` / `gallery` — thumbnail/card grid.
  - `kanban` — columns by status/category, items as cards.
  - `calendar` — items placed on a timeline/calendar.
  - `timeline` — chronological timeline view.
  - `tree` — hierarchical tree view.
  - `map` — geographic map with markers.
  - `chart` / `graph` — visualization of aggregate data.
  - `board` — freeform spatial arrangement.
  - `compact` / `dense` — condensed view with minimal info.
  - `detail` — each item gets a full panel.
- **`savedViews`**: Save and recall complete view configurations (columns, sort, filters, grouping, view mode).

### 4.7 Column/Field Configuration
- **`columnVisibility`**: Toggle which columns/fields are shown.
- **`columnOrder`**: Drag to reorder columns.
- **`columnResize`**: Drag to resize columns.
- **`columnPin`**: Pin columns to left/right edge.
- **`columnFreeze`**: Freeze columns while scrolling horizontally.

### 4.8 Export & Import
- **`export`**: Export the collection (or current view/selection) to a file.
  - `exportFormats`: Supported formats (`['csv', 'json', 'xlsx', 'pdf', 'xml']`).
  - `exportScope`: `'all'`, `'filtered'`, `'selected'`, `'currentPage'`.
  - `exportFields`: Which fields to include.
  - `exportHeaders`: Custom header labels for export.

- **`import`**: Import items from a file.
  - `importFormats`: Supported formats.
  - `importMapping`: Field mapping configuration.
  - `importValidation`: Validate before importing.
  - `importDuplicate`: How to handle duplicates (`'skip'`, `'update'`, `'create'`).
  - `importPreview`: Show preview before committing import.

### 4.9 Manual Ordering (drag & drop)
- **`reorder`**: Manually reorder items by dragging.
  - `reorderMode`: `'freeform'` (any position), `'withinGroup'` (only within current group).
  - `persistOrder`: Save the custom order.
  - `orderField`: Which field stores the sort position.

### 4.10 Refresh & Sync
- **`refresh`**: Reload the collection from the data source.
  - `autoRefresh`: Periodically refresh.
  - `autoRefreshInterval`: How often.
- **`realtime`**: Live updates when data changes (WebSocket, SSE).
  - `conflictResolution`: How to handle concurrent edits.

### 4.11 Undo/Redo
- **`undo`**: Undo the last operation.
- **`redo`**: Redo the last undone operation.
- **`undoStack`**: How many operations to keep in history.
- **`batchUndo`**: Undo a batch of related operations together.

### 4.12 Analytics & Summary
- **`summary`**: Show aggregate statistics (total count, breakdowns).
- **`charts`**: Show embedded charts/visualizations of the collection data.
- **`statistics`**: Show field-level statistics (min, max, avg, distribution).

### 4.13 Metadata & Schema
- **`introspect`**: Discover available fields and their types at runtime.
- **`customFields`**: Allow users to add custom fields to items.
- **`fieldConfiguration`**: Allow users to configure field-level display settings.

### 4.14 Collaboration
- **`sharedView`**: Share a specific view configuration with others via URL.
- **`presence`**: Show who else is viewing/editing the collection.
- **`notifications`**: Notify users about changes.
- **`comments`**: Collection-level comments/discussion.

### 4.15 Access Control
- **`permissions`**: Collection-level access control.
- **`audit`**: View audit log of all operations on the collection.

---

## 5. CROSS-CUTTING CONCERNS

These are meta-affordances that modify how other affordances behave.

### 5.1 Confirmation
- **`confirm`**: Require user confirmation before executing the operation.
  - `confirmMessage`: Custom confirmation message.
  - `confirmTitle`: Dialog title.
  - `confirmStyle`: `'dialog'`, `'popover'`, `'inline'`.

### 5.2 Loading & Progress
- **`async`**: The operation is asynchronous.
  - `loadingIndicator`: Show loading state.
  - `progressBar`: Show progress for long operations.
  - `cancelable`: Can the operation be canceled mid-execution.
  - `retryable`: Can the operation be retried on failure.

### 5.3 Notification
- **`toast`**: Show a toast notification on completion.
  - `toastSuccess`: Success message.
  - `toastError`: Error message.
  - `toastUndo`: Include an undo button in the toast.

### 5.4 Keyboard Shortcuts
- **`keyboardShortcut`**: Assign a keyboard shortcut to trigger this affordance.
  - Examples: `Ctrl+N` (create), `Delete` (delete selected), `/` (focus search), `Ctrl+A` (select all).

### 5.5 Context Sensitivity
- **`enabledWhen`**: Condition for when this affordance is available.
  - Based on: selection state, item state, user role, feature flags, collection size.
- **`visibleWhen`**: Condition for when this affordance's signifier (button, menu item) is shown.
  - Hidden vs. disabled distinction: hidden removes the signifier entirely; disabled shows it grayed out.

### 5.6 Server vs. Client
- **`server`**: This operation must be performed server-side.
- **`client`**: This operation can be performed client-side.
- **`hybrid`**: Can be performed client-side with server sync.

---

## 6. TERMINOLOGY RECOMMENDATIONS

Based on the academic literature and existing standards:

| Term | Definition | Source | Alternative terms |
|------|-----------|--------|-------------------|
| **Affordance** | An action possibility declared on a collection or field | Gibson [2], Norman [46] | Capability, operation, action, command |
| **Signifier** | The UI element that makes an affordance perceivable | Norman (2013) | Control, widget, indicator |
| **Collection** | An ordered set of typed items | Common in ORM/CMS | Resource, entity set, dataset, list |
| **Item** | A single member of a collection | Common | Entity, record, row, object, document |
| **Field** | A named property of an item | Common in forms | Column, property, attribute |
| **Schema** | The type declaration for items in a collection | JSON Schema, Zod | Model, type, shape, definition |
| **Capability** | A supported operation (synonym for affordance in OData) | OData [41] | Feature, ability |
| **Operation** | A concrete action that can be invoked | Hydra [11], Siren [12] | Action, command, method |
| **View** | A saved configuration of display settings | Notion, Airtable | Perspective, layout, preset |

### Recommended naming for the library

We recommend **"collection affordance"** as the primary term because:
1. "Affordance" is grounded in Gibson/Norman theory and maps precisely to the concept
2. "Capability" (OData's term) is too generic in TypeScript (conflicts with browser APIs)
3. "Operation" (Hydra/Siren term) implies action execution, while affordances include declarative attributes like `sortable` and `filterable` which are not operations per se
4. "Collection" is unambiguous and technology-neutral

For the schema-level API, use verbs/adjectives as field annotations:
- Adjectives for field capabilities: `sortable`, `filterable`, `searchable`, `editable`, `groupable`, `visible`
- Nouns for collection capabilities: `search`, `pagination`, `export`, `import`, `reorder`
- Verbs for item operations: `create`, `delete`, `duplicate`, `archive`
- Prefixed verbs for bulk operations: `bulkDelete`, `bulkEdit`, `bulkTag`

---

## 7. MAPPING TO UI SIGNIFIERS

Each affordance implies one or more UI signifiers. A renderer's job is to produce the right signifier for the declared affordance.

| Affordance | Common table signifier | Common list signifier | Common grid signifier |
|-----------|----------------------|---------------------|---------------------|
| sortable | Column header arrow icons | Sort dropdown/menu | Sort dropdown/menu |
| filterable (select) | Column header filter dropdown | Filter sidebar | Filter bar |
| filterable (range) | Column header range slider | Filter sidebar | Filter bar |
| filterable (text) | Column header text input | Filter sidebar / search | Search bar |
| searchable | Global search bar | Global search bar | Global search bar |
| editable (inline) | Click-to-edit cell | Click-to-edit field | Click-to-edit card |
| editable (form) | Edit button → modal/page | Edit button → modal/page | Edit button → modal/page |
| selectable | Row checkbox | Item checkbox | Card checkbox |
| bulkDelete | Toolbar "Delete N items" button | Same | Same |
| bulkEdit | Toolbar "Edit N items" button | Same | Same |
| create | Toolbar "New" button | Floating action button | Corner "+" button |
| export | Toolbar export button/menu | Same | Same |
| paginate (pages) | Bottom page number bar | Same | Same |
| paginate (infinite) | Scroll sentinel | Scroll sentinel | Scroll sentinel |
| groupBy | Group header rows | Group header sections | Group lanes |
| reorder | Drag handle + drop zones | Drag handle | Drag corners |
| columnVisibility | Column menu checkboxes | N/A | N/A |
| viewMode | Toggle button group (table/grid/list) | Same | Same |

---

## 8. PRIORITY TIERS FOR IMPLEMENTATION

### Tier 1 — Core (MVP)
These are the affordances needed for any useful collection UI:
- Field: `sortable`, `filterable`, `searchable`, `visible`, `editable`
- Item: `create`, `read`, `update`, `delete`, `select`
- Selection: `bulkDelete`, `selectAll`, `selectNone`
- Collection: `search`, `paginate`, `sort` (multi), `filter` (compound), `columnVisibility`

### Tier 2 — Essential
Common affordances that significantly enhance usability:
- Field: `groupable`, `aggregatable`, `displayFormat`, `inlineEditable`, `resizable`, `pinnable`
- Item: `duplicate`, `archive`, `expand`, `navigate`, `contextMenu`, `drag`
- Selection: `bulkEdit`, `bulkArchive`, `bulkTag`, `selectionSummary`
- Collection: `groupBy`, `viewMode`, `export`, `columnOrder`, `savedFilters`, `filterPresets`, `refresh`

### Tier 3 — Advanced
Affordances for power users and complex use cases:
- Field: `bulkEditable`, `editHistory`, `copyable`, `link`, `badge`
- Item: `tag`, `label`, `comment`, `rate`, `flag`, `assignTo`, `share`, `viewHistory`, `revert`, `mergeWith`
- Selection: `bulkMove`, `bulkMerge`, `bulkAssign`, `bulkPrioritize`
- Collection: `import`, `reorder`, `savedViews`, `realtime`, `undo`/`redo`, `customFields`, `advancedSearch`, `sharedView`

### Tier 4 — Specialized
Niche affordances for specific domains:
- Item: `publish`/`unpublish`, `lock`/`unlock`, `approve`/`reject`, `transfer`, `snapshot`
- Collection: `calendar`/`timeline`/`map`/`kanban` views, `presence`, `audit`, `permissions`, `notifications`, `charts`

---

## 9. DATA MODEL IMPLICATIONS

Each affordance implies requirements on the data model:

| Affordance | Data requirement |
|-----------|-----------------|
| `sortable` | Field must have a total ordering (comparable values) |
| `filterable(range)` | Field must be numeric or date-like |
| `filterable(select)` | Field must have an enumerable set of values |
| `searchable` | Field must be string-like (or have a string representation) |
| `groupable` | Field must have discrete values (or a discretization function) |
| `aggregatable(sum/avg)` | Field must be numeric |
| `reorder` | Items must have a position/order field |
| `softDelete` | Items must have a deletion/archived status field |
| `versioning` | Items must have a version number or history mechanism |
| `select` | Items must have a unique identifier |
| `bulkEdit` | The field must accept the same value across different items |
| `paginate(cursor)` | Items must have a cursor field (usually a sortable unique key) |
| `realtime` | Collection must have a change notification mechanism |
| `audit` | System must log operations with timestamps and actors |

---

## 10. COMPOSABILITY: HOW AFFORDANCES COMBINE

Some affordances compose naturally:
- `filterable` + `groupable` → Filtered items within groups
- `sortable` + `groupable` → Sorted items within each group, and sorted groups
- `search` + `filter` → Search within filtered results
- `select` + `bulkDelete` → Select then bulk delete
- `paginate` + `sort` + `filter` → Server-side sort/filter with paginated results
- `editable` + `select` + `bulkEdit` → Select items, edit a field value for all

Some affordances conflict or have precedence rules:
- `reorder` (manual drag) conflicts with `sort` (automatic ordering) — which takes precedence?
- `groupBy` and `sort` must compose: sort applies within groups
- `inlineEditable` cells in a `sortable` column — editing a sort key may move the row
- `paginate` and `selectAll` — does "select all" mean "this page" or "entire collection"?
- `filter` and `export` — does export include filtered items only or all items?

These composition rules should be part of the affordance schema documentation and enforced by the toolkit.
