import 'dart:convert';
import 'dart:math';

import 'package:http/http.dart' as http;

/// One AI-selected panel: a name/title plus its json-render spec.
class PanelSpec {
  final String name;
  final String title;
  final Map<String, dynamic> spec;
  PanelSpec({required this.name, required this.title, required this.spec});
}

class ChatResult {
  final String? summary;
  final String? text;
  final List<PanelSpec> specs;
  ChatResult({this.summary, this.text, this.specs = const []});
}

/// One catalog entry: a panel that's available to the app (built-in or custom).
class CatalogPanel {
  final String name;
  final String title;
  final bool custom;
  final Map<String, dynamic> spec;
  CatalogPanel({
    required this.name,
    required this.title,
    required this.custom,
    required this.spec,
  });
}

/// Talks to the EXISTING Next.js backend over HTTP. Nothing about the backend
/// is rebuilt here — this only calls /api/auth/guest and /api/chat.
class BackendApi {
  /// Base URL. Empty string => same-origin relative requests (Flutter web
  /// served on the same origin as the backend, e.g. behind a dev proxy).
  final String base;
  final http.Client _client = http.Client();
  bool _guestReady = false;

  BackendApi({this.base = ''});

  Uri _uri(String path) =>
      base.isEmpty ? Uri.parse(path) : Uri.parse('$base$path');

  /// Establish a guest session cookie via the backend's middleware flow.
  Future<void> ensureGuest() async {
    if (_guestReady) return;
    try {
      await _client.get(_uri('/api/auth/guest?redirectUrl=/'));
    } catch (_) {
      // The browser stores the cookie even if the redirect target differs.
    }
    _guestReady = true;
  }

  /// Fetch all available panels (built-ins + custom) with their specs.
  Future<List<CatalogPanel>> fetchCatalog() async {
    await ensureGuest();
    final res = await _client.get(_uri('/api/custom-panels'));
    if (res.statusCode != 200) {
      throw Exception('Catalog request failed (${res.statusCode})');
    }
    final data = jsonDecode(utf8.decode(res.bodyBytes)) as Map<String, dynamic>;
    final list = (data['panels'] as List?) ?? const [];
    return list.map((p) {
      final m = (p as Map).cast<String, dynamic>();
      return CatalogPanel(
        name: m['name']?.toString() ?? '',
        title: m['title']?.toString() ?? '',
        custom: m['custom'] == true,
        spec: (m['spec'] as Map?)?.cast<String, dynamic>() ?? <String, dynamic>{},
      );
    }).toList();
  }

  Future<ChatResult> sendMessage(String text) async {
    await ensureGuest();
    final body = jsonEncode({
      'id': _uuidV4(),
      'message': {
        'id': _uuidV4(),
        'role': 'user',
        'parts': [
          {'type': 'text', 'text': text},
        ],
      },
      'selectedChatModel': 'claude-opus-4-8',
      'selectedVisibilityType': 'private',
    });

    final res = await _client.post(
      _uri('/api/chat'),
      headers: {'content-type': 'application/json'},
      body: body,
    );
    if (res.statusCode != 200) {
      throw Exception('Chat request failed (${res.statusCode})');
    }
    // Decode as UTF-8 explicitly — http defaults to latin1 when the response
    // carries no charset, which would mangle characters like ≈ and ….
    return _parseStream(utf8.decode(res.bodyBytes, allowMalformed: true));
  }

  ChatResult _parseStream(String body) {
    String? summary;
    final textBuf = StringBuffer();
    final specs = <PanelSpec>[];

    for (final raw in const LineSplitter().convert(body)) {
      final line = raw.trim();
      if (!line.startsWith('data:')) continue;
      final payload = line.substring(5).trim();
      if (payload.isEmpty || payload == '[DONE]') continue;
      Map<String, dynamic> obj;
      try {
        obj = jsonDecode(payload) as Map<String, dynamic>;
      } catch (_) {
        continue;
      }
      switch (obj['type']) {
        case 'text-delta':
          if (obj['delta'] is String) textBuf.write(obj['delta']);
          break;
        case 'tool-output-available':
          final out = (obj['output'] as Map?)?.cast<String, dynamic>();
          if (out == null) break;
          if (out['summary'] is String) summary = out['summary'] as String;
          final list = (out['specs'] as List?) ?? const [];
          for (final s in list) {
            final m = (s as Map).cast<String, dynamic>();
            final spec = (m['spec'] as Map?)?.cast<String, dynamic>();
            if (spec == null) continue;
            specs.add(PanelSpec(
              name: m['name']?.toString() ?? '',
              title: m['title']?.toString() ?? '',
              spec: spec,
            ));
          }
          break;
      }
    }

    final txt = textBuf.toString().trim();
    return ChatResult(
      summary: summary,
      text: txt.isEmpty ? null : txt,
      specs: specs,
    );
  }
}

String _uuidV4() {
  final r = Random();
  final b = List<int>.generate(16, (_) => r.nextInt(256));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  String h(int i) => b[i].toRadixString(16).padLeft(2, '0');
  return '${h(0)}${h(1)}${h(2)}${h(3)}-${h(4)}${h(5)}-${h(6)}${h(7)}-'
      '${h(8)}${h(9)}-${h(10)}${h(11)}${h(12)}${h(13)}${h(14)}${h(15)}';
}
