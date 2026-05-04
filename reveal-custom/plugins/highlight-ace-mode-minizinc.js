/*
    ACE editor syntax highlighting mode for MiniZinc
    For use with the RevealHighlightAce plugin

    Usage in Reveal.initialize config:
        highlighting: {
            customModes: ['path/to/ace-mode-minizinc.js']
        }

    Then in slides:
        <pre><code data-language="minizinc">...</code></pre>

    The file is loaded by highlight-ace.js after ACE is available.
    It also works if loaded as a standalone <script> after ACE.
*/

(function () {
	var aceObj = typeof ace !== "undefined" ? ace : window.ace;

	aceObj.define(
		"ace/mode/minizinc_highlight_rules",
		["require", "exports", "module", "ace/lib/oop", "ace/mode/text_highlight_rules"],
		function (require, exports, module) {
			var oop = require("ace/lib/oop");
			var TextHighlightRules = require("ace/mode/text_highlight_rules").TextHighlightRules;

			var MiniZincHighlightRules = function () {
				var keywords =
					"constraint|solve|satisfy|minimize|maximize|" +
					"predicate|function|test|annotation|" +
					"include|output|type|enum|" +
					"if|then|else|elseif|endif|" +
					"let|in|where|case|default|" +
					"var|par|opt|of|any|" +
					"not|xor|div|mod|" +
					"union|intersect|diff|symdiff|subset|superset";

				var builtinTypes = "int|float|bool|string|set|array|list|tuple|record|variant_record|ann";

				var builtinConstants = "true|false|infinity";

				var builtinFunctions =
					// Arithmetic / math
					"abs|min|max|min_weak|max_weak|sum|product|count|" +
					"pow|sqrt|exp|ln|log|" +
					"sin|cos|tan|asin|acos|atan|sinh|cosh|tanh|asinh|acosh|atanh|" +
					"ceil|floor|round|" +
					// Coercion
					"bool2int|bool2float|int2float|enum2int|set2array|" +
					// Logical aggregates
					"forall|exists|xorall|iffall|clause|bool_not|" +
					// Array functions
					"length|reverse|array1d|array2d|array3d|array4d|array5d|array6d|" +
					"arrayXd|arrayNd|index_set|row|col|array2set|" +
					"has_index|has_element|sort|sort_by|arg_sort|arg_max|arg_min|arg_val|" +
					"zip|unzip|" +
					// Set functions
					"card|array_union|array_intersect|set_to_ranges|" +
					// String functions
					"show|show_int|show_float|show2d|show3d|show2d_indexed|show_indexed|" +
					"showJSON|showDzn|concat|join|string_length|string_split|format|" +
					"format_justify_string|json_object|json_array|file_path|" +
					// Enum functions
					"enum_of|enum_next|enum_prev|to_enum|anon_enum|" +
					// Option type functions
					"occurs|absent|deopt|" +
					// Reflection / bounds
					"lb|ub|lb_array|ub_array|dom|dom_array|dom_size|dom_bounds_array|" +
					"fix|is_fixed|has_bounds|has_ub_set|has_ann|annotate|is_same|" +
					// Debug / assert
					"assert|assert_dbg|abort|trace|trace_dbg|trace_exp|trace_stdout|" +
					"trace_logstream|trace_to_section|trace_to_json_section|logstream_to_string|" +
					// Common global constraints
					"alldifferent|all_different|all_different_except|all_different_except_0|" +
					"all_disjoint|all_equal|among|at_least|at_most|at_most1|exactly|" +
					"bin_packing|bin_packing_capa|bin_packing_load|" +
					"circuit|subcircuit|" +
					"count_eq|count_geq|count_gt|count_leq|count_lt|count_neq|" +
					"cumulative|cumulatives|" +
					"decreasing|increasing|strictly_decreasing|strictly_increasing|" +
					"diffn|diffn_nonstrict|diffn_k|diffn_nonstrict_k|" +
					"disjoint|disjunctive|disjunctive_strict|distribute|element|" +
					"global_cardinality|global_cardinality_closed|global_cardinality_low_up|" +
					"inverse|inverse_set|inverse_in_range|knapsack|" +
					"lex_less|lex_lesseq|lex_greater|lex_greatereq|lex2|" +
					"lex_chain_less|lex_chain_lesseq|" +
					"link_set_to_booleans|maximum|minimum|member|" +
					"network_flow|nvalue|partition_set|piecewise_linear|range|roots|" +
					"reachable|connected|dag|tree|steiner|" +
					"regular|regular_nfa|regular_regexp|cost_regular|" +
					"seq_precede_chain|value_precede|value_precede_chain|" +
					"sliding_sum|sliding_among|span|alternative|subgraph|table|" +
					"weighted_spanning_tree|" +
					"symmetry_breaking_constraint|redundant_constraint|implied_constraint";

				var builtinAnnotations =
					"seq_search|int_search|bool_search|float_search|set_search|" +
					"input_order|first_fail|anti_first_fail|smallest|largest|" +
					"occurrence|most_constrained|max_regret|dom_w_deg|impact|" +
					"indomain|indomain_min|indomain_max|indomain_middle|indomain_median|" +
					"indomain_random|indomain_split|indomain_split_random|" +
					"indomain_reverse_split|indomain_interval|" +
					"outdomain_min|outdomain_max|outdomain_median|outdomain_random|" +
					"complete|domain|bounds|value_propagation|domain_propagation|bounds_propagation|" +
					"restart_luby|restart_geometric|restart_linear|restart_constant|restart_none|" +
					"relax_and_reconstruct|" +
					"add_to_output|no_output|output_var|output_only|output_array|" +
					"is_defined_var|defines_var|var_is_introduced|computed_domain|" +
					"promise_total|maybe_partial|no_cse|promise_commutative|cache_result|" +
					"warm_start|warm_start_array";

				var keywordMapper = this.createKeywordMapper(
					{
						keyword: keywords,
						"support.type": builtinTypes,
						"constant.language": builtinConstants,
						"support.function": builtinFunctions,
						"variable.language": builtinAnnotations,
					},
					"identifier",
				);

				this.$rules = {
					start: [
						// Documentation comments (must come before block comments)
						{
							token: "comment.doc",
							regex: "/\\*\\*(?:[*](?!/)|[^*])*\\*/",
						},
						// Block comments
						{
							token: "comment.block",
							regex: "/\\*",
							next: "block_comment",
						},
						// Line comments
						{
							token: "comment.line",
							regex: "%.*$",
						},
						// String with interpolation support
						{
							token: "string.start",
							regex: '"',
							next: "string",
						},
						// Hex integers
						{
							token: "constant.numeric.hex",
							regex: "0[xX][0-9a-fA-F]+\\b",
						},
						// Octal integers
						{
							token: "constant.numeric.octal",
							regex: "0[oO][0-7]+\\b",
						},
						// Floats (must come before integer rule)
						{
							token: "constant.numeric.float",
							regex: "\\b\\d+\\.\\d+(?:[eE][+-]?\\d+)?\\b",
						},
						{
							token: "constant.numeric.float",
							regex: "\\b\\d+[eE][+-]?\\d+\\b",
						},
						// Integers
						{
							token: "constant.numeric.integer",
							regex: "\\b\\d+\\b",
						},
						// Annotation operator
						{
							token: "keyword.operator.annotation",
							regex: "::",
						},
						// 2D array literal brackets
						{
							token: "paren.lparen",
							regex: "\\[\\|",
						},
						{
							token: "paren.rparen",
							regex: "\\|\\]",
						},
						// Multi-char operators (order matters — longest match first)
						{
							token: "keyword.operator",
							regex:
								"<->|->|<-|\\.\\.<|<\\.\\.|<\\.\\.<|\\.\\.|\\+\\+|~\\+|~-|~\\*|~/|~div|~=|~!=|>=|<=|!=|==|/\\\\|\\\\/|\\^-1",
						},
						// Absent value
						{
							token: "constant.language",
							regex: "<>",
						},
						// Single-char operators
						{
							token: "keyword.operator",
							regex: "[+\\-*/%^=<>]",
						},
						// Brackets
						{
							token: "paren.lparen",
							regex: "[\\[({]",
						},
						{
							token: "paren.rparen",
							regex: "[\\])}]",
						},
						// Punctuation
						{
							token: "punctuation",
							regex: "[;,:|]",
						},
						// Anonymous variable
						{
							token: "variable.other",
							regex: "\\b_\\b",
						},
						// Type-inst variable identifiers ($T, $$E)
						{
							token: "variable.parameter",
							regex: "\\$\\$?[A-Za-z][A-Za-z0-9_]*",
						},
						// Quoted identifiers
						{
							token: "identifier.quoted",
							regex: "`[^`]+`",
						},
						// Identifiers and keyword matching
						{
							token: keywordMapper,
							regex: "[a-zA-Z_][a-zA-Z0-9_]*",
						},
						// Whitespace
						{
							token: "text",
							regex: "\\s+",
						},
					],

					block_comment: [
						{
							token: "comment.block",
							regex: "\\*/",
							next: "start",
						},
						{
							defaultToken: "comment.block",
						},
					],

					string: [
						// Escape sequences
						{
							token: "constant.character.escape",
							regex: "\\\\(?:[\\\\\"'nt]|x[0-9a-fA-F]{2}|[0-7]{1,3})",
						},
						// String interpolation start
						{
							token: "paren.quasi.start",
							regex: "\\\\\\(",
							push: "interpolation",
						},
						// End of string
						{
							token: "string.end",
							regex: '"',
							next: "start",
						},
						// String content
						{
							defaultToken: "string",
						},
					],

					interpolation: [
						// Nested parentheses inside interpolation
						{
							token: "paren.lparen",
							regex: "\\(",
							push: "interpolation_parens",
						},
						// End of interpolation
						{
							token: "paren.quasi.end",
							regex: "\\)",
							next: "pop",
						},
						// Re-use start rules inside interpolation for full expression highlighting
						{
							include: "start",
						},
					],

					interpolation_parens: [
						{
							token: "paren.lparen",
							regex: "\\(",
							push: "interpolation_parens",
						},
						{
							token: "paren.rparen",
							regex: "\\)",
							next: "pop",
						},
						{
							include: "start",
						},
					],
				};

				this.normalizeRules();
			};

			oop.inherits(MiniZincHighlightRules, TextHighlightRules);
			exports.MiniZincHighlightRules = MiniZincHighlightRules;
		},
	);

	aceObj.define(
		"ace/mode/minizinc",
		["require", "exports", "module", "ace/lib/oop", "ace/mode/text", "ace/mode/minizinc_highlight_rules"],
		function (require, exports, module) {
			var oop = require("ace/lib/oop");
			var TextMode = require("ace/mode/text").Mode;
			var MiniZincHighlightRules = require("ace/mode/minizinc_highlight_rules").MiniZincHighlightRules;

			var Mode = function () {
				this.HighlightRules = MiniZincHighlightRules;
				this.$behaviour = this.$defaultBehaviour;
			};
			oop.inherits(Mode, TextMode);

			(function () {
				this.lineCommentStart = "%";
				this.blockComment = { start: "/*", end: "*/" };
				this.$id = "ace/mode/minizinc";
			}).call(Mode.prototype);

			exports.Mode = Mode;
		},
	);
})();
