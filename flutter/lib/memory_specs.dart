import 'api.dart';

// Build json-render specs from the two-part memory using ONLY the existing
// finance primitives (Card, Stack, ListItem, Text, BarGraph, Metric) — mirrors
// the web lib/catalog/memory-specs.ts so the Flutter render matches /memory.

const _months = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

String _formatTime(String iso) {
  try {
    final d = DateTime.parse(iso).toLocal();
    final ampm = d.hour >= 12 ? 'PM' : 'AM';
    var h = d.hour % 12;
    if (h == 0) h = 12;
    final hh = h.toString().padLeft(2, '0');
    final mm = d.minute.toString().padLeft(2, '0');
    return '${_months[d.month - 1]} ${d.day}, $hh:$mm $ampm';
  } catch (_) {
    return iso;
  }
}

/// LEFT column: append-only timeline of individual votes as ListItems.
Map<String, dynamic> buildDeclarativeSpec(FinanceMemory m) {
  final facts = m.declarative.reversed.toList(); // newest first
  final n = m.declarative.length;
  final elements = <String, dynamic>{
    'card': {
      'type': 'Card',
      'props': {
        'title': 'Declarative — what happened',
        'subtitle': '$n feedback ${n == 1 ? 'event' : 'events'} logged, newest first',
        'accent': '#6366f1',
      },
      'children': ['stack'],
    },
    'stack': {
      'type': 'Stack',
      'props': {'direction': 'col', 'gap': 'sm'},
      'children': <String>[],
    },
  };

  if (facts.isEmpty) {
    elements['empty'] = {
      'type': 'Text',
      'props': {'content': 'No feedback recorded yet.', 'muted': true, 'size': 'sm'},
    };
    elements['stack']['children'] = ['empty'];
    return {'root': 'card', 'elements': elements};
  }

  final childKeys = <String>[];
  for (var i = 0; i < facts.length; i++) {
    final f = facts[i];
    final up = (f['vote'] is num ? f['vote'] as num : 0) > 0;
    final key = 'fact-$i';
    elements[key] = {
      'type': 'ListItem',
      'props': {
        'primary': '${f['question']} → ${f['panel']}',
        'secondary':
            '${f['questionType']} · ${_formatTime(f['timestamp']?.toString() ?? '')}',
        'badge': up ? '👍 +1' : '👎 −1',
        'badgeTone': up ? 'positive' : 'danger',
      },
    };
    childKeys.add(key);
  }
  elements['stack']['children'] = childKeys;
  return {'root': 'card', 'elements': elements};
}

/// RIGHT column: consolidated per-question-type scores as Text + Metric + BarGraph.
Map<String, dynamic> buildProceduralSpec(FinanceMemory m) {
  final types = m.procedural.keys.toList()..sort();
  final elements = <String, dynamic>{
    'card': {
      'type': 'Card',
      'props': {
        'title': 'Procedural — what became habit',
        'subtitle':
            '${types.length} question ${types.length == 1 ? 'type' : 'types'} consolidated from feedback',
        'accent': '#10b981',
      },
      'children': ['stack'],
    },
    'stack': {
      'type': 'Stack',
      'props': {'direction': 'col', 'gap': 'lg'},
      'children': <String>[],
    },
  };

  if (types.isEmpty) {
    elements['empty'] = {
      'type': 'Text',
      'props': {
        'content': 'No habits formed yet — vote on panels to build scores.',
        'muted': true,
        'size': 'sm',
      },
    };
    elements['stack']['children'] = ['empty'];
    return {'root': 'card', 'elements': elements};
  }

  final groupKeys = <String>[];
  for (var i = 0; i < types.length; i++) {
    final type = types[i];
    final scores = m.procedural[type]!;
    final ranked = scores.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));
    final topPanel = ranked.first.key;
    final topScore = ranked.first.value;

    final groupKey = 'group-$i';
    final headerKey = 'header-$i';
    final metricKey = 'metric-$i';
    final barKey = 'bar-$i';

    elements[headerKey] = {
      'type': 'Text',
      'props': {'content': type, 'weight': 'medium', 'size': 'base'},
    };
    elements[metricKey] = {
      'type': 'Metric',
      'props': {
        'label': 'Preferred panel',
        'value': topPanel,
        'delta': '${topScore > 0 ? '+' : ''}$topScore net votes',
        'trend': topScore > 0 ? 'up' : (topScore < 0 ? 'down' : 'flat'),
      },
    };
    elements[barKey] = {
      'type': 'BarGraph',
      'props': {
        'data': [
          for (final e in ranked)
            {
              'label': e.key,
              'value': e.value,
              'color': e.value >= 0 ? '#10b981' : '#f43f5e',
            },
        ],
      },
    };
    elements[groupKey] = {
      'type': 'Stack',
      'props': {'direction': 'col', 'gap': 'sm'},
      'children': [headerKey, metricKey, barKey],
    };
    groupKeys.add(groupKey);
  }
  elements['stack']['children'] = groupKeys;
  return {'root': 'card', 'elements': elements};
}
