import 'package:flutter/material.dart';

import 'api.dart';
import 'render.dart';
import 'theme.dart';

/// Catalog screen: fetches all available panels (built-ins + custom) from the
/// existing /api/custom-panels endpoint and renders each with SpecRenderer,
/// marking custom ones with a "custom" badge — mirroring web /catalog-test.
class CatalogScreen extends StatefulWidget {
  const CatalogScreen({super.key});
  @override
  State<CatalogScreen> createState() => _CatalogScreenState();
}

class _CatalogScreenState extends State<CatalogScreen> {
  final _api = BackendApi();
  late Future<List<CatalogPanel>> _future;

  @override
  void initState() {
    super.initState();
    _future = _api.fetchCatalog();
  }

  void _reload() => setState(() => _future = _api.fetchCatalog());

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<CatalogPanel>>(
      future: _future,
      builder: (context, snap) {
        if (snap.connectionState == ConnectionState.waiting) {
          return const Center(
            child: SizedBox(
              width: 22,
              height: 22,
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
          );
        }
        if (snap.hasError) {
          return Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text('Could not load the catalog',
                    style: TextStyle(fontSize: 14, color: AppColors.foreground)),
                const SizedBox(height: 8),
                OutlinedButton(onPressed: _reload, child: const Text('Retry')),
              ],
            ),
          );
        }
        final panels = snap.data ?? const [];
        return SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Finance Catalog — Panel Preview',
                  style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                      color: AppColors.foreground)),
              const SizedBox(height: 6),
              const Text(
                'Built-in panels plus any custom panels you remixed, rendered '
                'from json-render specs by the same SpecRenderer as the chat.',
                style: TextStyle(fontSize: 13, color: AppColors.mutedForeground),
              ),
              const SizedBox(height: 20),
              _grid(panels),
            ],
          ),
        );
      },
    );
  }

  Widget _grid(List<CatalogPanel> panels) {
    return LayoutBuilder(builder: (context, c) {
      const gap = 20.0;
      final columns = c.maxWidth >= 1080
          ? 3
          : c.maxWidth >= 720
              ? 2
              : 1;
      final itemW = (c.maxWidth - gap * (columns - 1)) / columns;
      return Wrap(
        spacing: gap,
        runSpacing: gap,
        children: [
          for (final p in panels)
            SizedBox(
              width: itemW > 0 ? itemW : c.maxWidth,
              child: _PanelCard(panel: p),
            ),
        ],
      );
    });
  }
}

class _PanelCard extends StatelessWidget {
  final CatalogPanel panel;
  const _PanelCard({required this.panel});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Row(
            children: [
              Text(panel.name,
                  style: const TextStyle(
                    fontFamily: 'monospace',
                    fontSize: 12,
                    color: AppColors.mutedForeground,
                  )),
              if (panel.custom) ...[
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: const Text('custom',
                      style: TextStyle(fontSize: 10, color: AppColors.primary)),
                ),
              ],
            ],
          ),
        ),
        SpecRenderer(spec: panel.spec),
      ],
    );
  }
}
