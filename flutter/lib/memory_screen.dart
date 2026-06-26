import 'package:flutter/material.dart';

import 'api.dart';
import 'memory_specs.dart';
import 'render.dart';
import 'theme.dart';

/// Memory screen: fetches the two-part memory from /api/memory and renders two
/// columns — Declarative (vote timeline) and Procedural (scores per question
/// type) — via the existing SpecRenderer, mirroring the web /memory page.
class MemoryScreen extends StatefulWidget {
  const MemoryScreen({super.key});
  @override
  State<MemoryScreen> createState() => _MemoryScreenState();
}

class _MemoryScreenState extends State<MemoryScreen> {
  final _api = BackendApi();
  late Future<FinanceMemory> _future;

  @override
  void initState() {
    super.initState();
    _future = _api.fetchMemory();
  }

  void _reload() => setState(() => _future = _api.fetchMemory());

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<FinanceMemory>(
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
                const Text('Could not load memory',
                    style: TextStyle(fontSize: 14, color: AppColors.foreground)),
                const SizedBox(height: 8),
                OutlinedButton(onPressed: _reload, child: const Text('Retry')),
              ],
            ),
          );
        }
        final memory = snap.data!;
        final declSpec = buildDeclarativeSpec(memory);
        final procSpec = buildProceduralSpec(memory);

        return RefreshIndicator(
          onRefresh: () async => _reload(),
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Expanded(
                      child: Text('Memory',
                          style: TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.w700,
                              color: AppColors.foreground)),
                    ),
                    IconButton(
                      tooltip: 'Refresh',
                      onPressed: _reload,
                      icon: const Icon(Icons.refresh, size: 18),
                      color: AppColors.mutedForeground,
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                const Text(
                  'How the assistant remembers your panel feedback. Left: the '
                  'append-only declarative log of individual votes. Right: the '
                  'procedural memory — consolidated scores per question type that '
                  'build from the facts on the left and steer future panels.',
                  style: TextStyle(fontSize: 13, color: AppColors.mutedForeground),
                ),
                const SizedBox(height: 20),
                _columns(declSpec, procSpec),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _columns(
    Map<String, dynamic> declSpec,
    Map<String, dynamic> procSpec,
  ) {
    return LayoutBuilder(builder: (context, c) {
      final left = SpecRenderer(spec: declSpec);
      final right = SpecRenderer(spec: procSpec);
      if (c.maxWidth < 860) {
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [left, const SizedBox(height: 20), right],
        );
      }
      return Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(child: left),
          const SizedBox(width: 20),
          Expanded(child: right),
        ],
      );
    });
  }
}
