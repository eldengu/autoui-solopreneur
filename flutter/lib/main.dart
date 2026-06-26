import 'package:flutter/material.dart';

import 'api.dart';
import 'catalog_screen.dart';
import 'memory_screen.dart';
import 'render.dart';
import 'theme.dart';

void main() => runApp(const AutoUiApp());

class AutoUiApp extends StatelessWidget {
  const AutoUiApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'AutoUI — Solopreneur Finance',
      debugShowCheckedModeBanner: false,
      theme: buildTheme(),
      home: const HomeShell(),
    );
  }
}

/// App shell: a persistent left sidebar (mirroring the web app) + the active
/// screen. IndexedStack preserves each screen's state across navigation.
class HomeShell extends StatefulWidget {
  const HomeShell({super.key});
  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _index = 0;

  static const _titles = ['Chat', 'Catalog', 'Memory'];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _Sidebar(index: _index, onSelect: (i) => setState(() => _index = i)),
          Expanded(
            child: Column(
              children: [
                _TopBar(title: _titles[_index]),
                Expanded(
                  child: IndexedStack(
                    index: _index,
                    children: const [
                      ChatView(),
                      CatalogScreen(),
                      MemoryScreen(),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _TopBar extends StatelessWidget {
  final String title;
  const _TopBar({required this.title});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 52,
      decoration: const BoxDecoration(
        color: AppColors.card,
        border: Border(bottom: BorderSide(color: AppColors.border)),
      ),
      alignment: Alignment.centerLeft,
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Text(
        'AutoUI · Solopreneur Finance — $title',
        style: const TextStyle(
            fontSize: 15, fontWeight: FontWeight.w600, color: AppColors.foreground),
      ),
    );
  }
}

class _Sidebar extends StatelessWidget {
  final int index;
  final ValueChanged<int> onSelect;
  const _Sidebar({required this.index, required this.onSelect});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 232,
      decoration: const BoxDecoration(
        color: AppColors.card,
        border: Border(right: BorderSide(color: AppColors.border)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
            child: Row(
              children: [
                Container(
                  width: 28,
                  height: 28,
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  alignment: Alignment.center,
                  child: const Icon(Icons.bolt, size: 16, color: Colors.white),
                ),
                const SizedBox(width: 10),
                const Text('AutoUI',
                    style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: AppColors.foreground)),
              ],
            ),
          ),
          const Divider(height: 1, color: AppColors.border),
          const SizedBox(height: 8),
          _NavItem(
            icon: Icons.chat_bubble_outline,
            label: 'Chat',
            selected: index == 0,
            onTap: () => onSelect(0),
          ),
          _NavItem(
            icon: Icons.grid_view_rounded,
            label: 'Catalog',
            selected: index == 1,
            onTap: () => onSelect(1),
          ),
          _NavItem(
            icon: Icons.psychology_outlined,
            label: 'Memory',
            selected: index == 2,
            onTap: () => onSelect(2),
          ),
          const Spacer(),
          const Padding(
            padding: EdgeInsets.all(16),
            child: Text('guest@local',
                style: TextStyle(fontSize: 12, color: AppColors.mutedForeground)),
          ),
        ],
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool selected;
  final VoidCallback onTap;
  const _NavItem({
    required this.icon,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      child: Material(
        color: selected ? AppColors.muted : Colors.transparent,
        borderRadius: BorderRadius.circular(8),
        child: InkWell(
          borderRadius: BorderRadius.circular(8),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 9),
            child: Row(
              children: [
                Icon(icon,
                    size: 18,
                    color:
                        selected ? AppColors.foreground : AppColors.mutedForeground),
                const SizedBox(width: 10),
                Text(label,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
                      color:
                          selected ? AppColors.foreground : AppColors.mutedForeground,
                    )),
              ],
            ),
          ),
        ),
      ),
    );
  }
}


// ---- Chat screen (body-only; lives inside the shell) ----------------------

class ChatView extends StatefulWidget {
  const ChatView({super.key});
  @override
  State<ChatView> createState() => _ChatViewState();
}

class _Msg {
  final bool user;
  final String? text;
  final String? summary;
  final List<PanelSpec> specs;
  _Msg.user(this.text)
      : user = true,
        summary = null,
        specs = const [];
  _Msg.assistant({this.text, this.summary, this.specs = const []}) : user = false;
}

class _ChatViewState extends State<ChatView> {
  final _api = BackendApi(); // same-origin
  final _controller = TextEditingController();
  final _scroll = ScrollController();
  final List<_Msg> _messages = [];
  bool _loading = false;

  Future<void> _send(String text) async {
    final q = text.trim();
    if (q.isEmpty || _loading) return;
    setState(() {
      _messages.add(_Msg.user(q));
      _loading = true;
      _controller.clear();
    });
    _scrollToEnd();
    try {
      final res = await _api.sendMessage(q);
      setState(() {
        _messages.add(_Msg.assistant(
          summary: res.summary,
          text: res.specs.isEmpty ? res.text : null,
          specs: res.specs,
        ));
      });
    } catch (e) {
      setState(() => _messages.add(_Msg.assistant(text: 'Something went wrong: $e')));
    } finally {
      setState(() => _loading = false);
      _scrollToEnd();
    }
  }

  void _scrollToEnd() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scroll.hasClients) {
        _scroll.animateTo(_scroll.position.maxScrollExtent,
            duration: const Duration(milliseconds: 250), curve: Curves.easeOut);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Expanded(child: _messages.isEmpty ? _empty() : _list()),
        _composer(),
      ],
    );
  }

  Widget _empty() {
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 460),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Ask a finance question',
                style: TextStyle(
                    fontSize: 20, fontWeight: FontWeight.w600, color: AppColors.foreground)),
            const SizedBox(height: 8),
            const Text(
              'Claude answers with interactive panels rendered as Flutter widgets.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13, color: AppColors.mutedForeground),
            ),
            const SizedBox(height: 20),
            Wrap(
              alignment: WrapAlignment.center,
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final s in const [
                  'How are my taxes?',
                  'Am I going under?',
                  "How's my business doing?",
                ])
                  ActionChip(
                    label: Text(s),
                    backgroundColor: AppColors.card,
                    side: const BorderSide(color: AppColors.border),
                    onPressed: () => _send(s),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _list() {
    return ListView.builder(
      controller: _scroll,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      itemCount: _messages.length + (_loading ? 1 : 0),
      itemBuilder: (context, i) {
        if (i >= _messages.length) return _thinking();
        final m = _messages[i];
        return Align(
          alignment: m.user ? Alignment.centerRight : Alignment.centerLeft,
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 680),
            child: m.user ? _userBubble(m) : _assistant(m),
          ),
        );
      },
    );
  }

  Widget _userBubble(_Msg m) => Container(
        margin: const EdgeInsets.only(bottom: 16, left: 40),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: AppColors.muted,
          borderRadius: const BorderRadius.only(
            topLeft: Radius.circular(16),
            topRight: Radius.circular(16),
            bottomLeft: Radius.circular(16),
            bottomRight: Radius.circular(6),
          ),
          border: Border.all(color: AppColors.border),
        ),
        child: Text(m.text ?? '',
            style: const TextStyle(fontSize: 13, color: AppColors.foreground)),
      );

  Widget _assistant(_Msg m) {
    return Container(
      margin: const EdgeInsets.only(bottom: 20, right: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (m.summary != null || m.text != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Text(m.summary ?? m.text ?? '',
                  style: const TextStyle(
                      fontSize: 13, height: 1.5, color: AppColors.foreground)),
            ),
          for (var i = 0; i < m.specs.length; i++)
            Padding(
              padding: EdgeInsets.only(bottom: i == m.specs.length - 1 ? 0 : 12),
              child: SpecRenderer(spec: m.specs[i].spec),
            ),
        ],
      ),
    );
  }

  Widget _thinking() => const Padding(
        padding: EdgeInsets.only(bottom: 16),
        child: Row(
          children: [
            SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)),
            SizedBox(width: 10),
            Text('Assembling panels…',
                style: TextStyle(fontSize: 13, color: AppColors.mutedForeground)),
          ],
        ),
      );

  Widget _composer() {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.card,
        border: Border(top: BorderSide(color: AppColors.border)),
      ),
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 720),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _controller,
                  onSubmitted: _send,
                  enabled: !_loading,
                  style: const TextStyle(fontSize: 14),
                  decoration: InputDecoration(
                    hintText: 'Ask anything…',
                    hintStyle: const TextStyle(color: AppColors.mutedForeground),
                    filled: true,
                    fillColor: AppColors.background,
                    contentPadding:
                        const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: const BorderSide(color: AppColors.border),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: const BorderSide(color: AppColors.border),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: const BorderSide(color: AppColors.primary),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              SizedBox(
                height: 44,
                width: 44,
                child: ElevatedButton(
                  onPressed: _loading ? null : () => _send(_controller.text),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.foreground,
                    foregroundColor: AppColors.card,
                    padding: EdgeInsets.zero,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  child: const Icon(Icons.arrow_upward, size: 18),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
