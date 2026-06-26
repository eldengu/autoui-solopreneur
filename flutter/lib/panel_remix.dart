import 'package:flutter/material.dart';

import 'api.dart';
import 'theme.dart';

/// Opens the "combine panels" dialog. Resolves to the new panel's name on
/// success, or null if cancelled/failed.
Future<String?> showPanelRemixDialog(BuildContext context, BackendApi api) {
  return showDialog<String>(
    context: context,
    builder: (_) => _RemixDialog(api: api),
  );
}

class _RemixDialog extends StatefulWidget {
  final BackendApi api;
  const _RemixDialog({required this.api});
  @override
  State<_RemixDialog> createState() => _RemixDialogState();
}

class _RemixDialogState extends State<_RemixDialog> {
  List<CatalogPanel> _panels = [];
  final Set<String> _selected = {};
  final _instruction = TextEditingController();
  bool _loading = true;
  bool _creating = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final panels = await widget.api.fetchCatalog();
      if (mounted) setState(() {
        _panels = panels;
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() {
        _error = 'Could not load panels';
        _loading = false;
      });
    }
  }

  Future<void> _create() async {
    if (_selected.isEmpty) {
      setState(() => _error = 'Select at least one panel to combine');
      return;
    }
    if (_instruction.text.trim().isEmpty) {
      setState(() => _error = 'Describe how to combine the panels');
      return;
    }
    setState(() {
      _creating = true;
      _error = null;
    });
    final panel = await widget.api.createCustomPanel(
      sourcePanels: _selected.toList(),
      instruction: _instruction.text.trim(),
    );
    if (!mounted) return;
    if (panel != null) {
      Navigator.of(context).pop(panel['name']?.toString() ?? 'panel');
    } else {
      setState(() {
        _creating = false;
        _error = 'Could not create the panel — try again';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      backgroundColor: AppColors.card,
      title: const Text('Create a custom panel',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
      content: SizedBox(
        width: 420,
        child: _loading
            ? const SizedBox(
                height: 80,
                child: Center(
                    child: SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2))),
              )
            : Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Select one or more panels and describe how to combine them. '
                    'Claude builds a new panel from the existing primitives.',
                    style: TextStyle(fontSize: 12, color: AppColors.mutedForeground),
                  ),
                  const SizedBox(height: 12),
                  const Text('Panels to combine',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500)),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      for (final p in _panels)
                        _PanelChip(
                          label: p.custom ? '${p.name} ★' : p.name,
                          selected: _selected.contains(p.name),
                          onTap: _creating
                              ? null
                              : () => setState(() {
                                    if (!_selected.add(p.name)) {
                                      _selected.remove(p.name);
                                    }
                                  }),
                        ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  const Text('Instruction',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500)),
                  const SizedBox(height: 6),
                  TextField(
                    controller: _instruction,
                    enabled: !_creating,
                    minLines: 2,
                    maxLines: 4,
                    style: const TextStyle(fontSize: 13),
                    decoration: InputDecoration(
                      hintText: 'e.g. merge these into one compact panel',
                      hintStyle: const TextStyle(color: AppColors.mutedForeground),
                      contentPadding: const EdgeInsets.all(10),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide: const BorderSide(color: AppColors.border),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide: const BorderSide(color: AppColors.border),
                      ),
                    ),
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 8),
                    Text(_error!,
                        style: TextStyle(
                            fontSize: 12, color: AppColors.toneText['danger'])),
                  ],
                ],
              ),
      ),
      actions: [
        TextButton(
          onPressed: _creating ? null : () => Navigator.of(context).pop(),
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: (_loading || _creating) ? null : _create,
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.foreground,
            foregroundColor: AppColors.card,
          ),
          child: Text(_creating ? 'Creating…' : 'Create panel'),
        ),
      ],
    );
  }
}

class _PanelChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback? onTap;
  const _PanelChip({required this.label, required this.selected, this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(8),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          border: Border.all(
              color: selected ? AppColors.primary : AppColors.border),
          color: selected
              ? AppColors.primary.withValues(alpha: 0.1)
              : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(label,
            style: TextStyle(
              fontSize: 12,
              color: selected ? AppColors.foreground : AppColors.mutedForeground,
            )),
      ),
    );
  }
}
