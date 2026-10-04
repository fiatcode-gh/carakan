// Runs the Dart engine over the fixed parity input set and writes the results
// as the differential fixture. Usage: dart run bin/dump.dart <commit> <out>.
// Deterministic: no timestamps, seeded randomness, insertion-ordered inputs.
import 'dart:convert';
import 'dart:io';
import 'dart:math';

import 'package:aksara_engine/aksara_engine.dart';

import '../../../../.cache/parity/src/app/tool/shaping/dump_cases.dart'
    as shaping;
import '../../../../.cache/parity/src/packages/aksara_engine/test/golden_pairs.dart';

const _vowels = [
  'a', 'i', 'u', 'e', 'é', 'è', 'ě', 'ê', 'o', //
  'aa', 'ii', 'uu', 'ā', 'ī', 'ū', 'ai', 'au',
];
const _codas = ['', 'ŋ', 'ṙ', 'ḥ', 'ng', 'r', 'h', 'k', 'n', '/'];

void main(List<String> args) {
  final commit = args[0];
  final outPath = args[1];

  final words =
      (jsonDecode(
                File(
                  '../../../.cache/parity/src/app/assets/content/v1/words.json',
                ).readAsStringSync(),
              )['words']
              as List)
          .cast<Map<String, dynamic>>();
  final edge =
      (jsonDecode(File('../inputs/latin-edge.json').readAsStringSync()) as List)
          .cast<String>();

  final latin = <String>{};

  // 1. Goldens.
  for (final g in goldenPairs) {
    latin
      ..add(g.latinPujl)
      ..add(g.latinJgst);
  }
  // 2. Corpus.
  for (final w in words) {
    latin.add(w['canonical'] as String);
    final d = w['displayPujl'];
    if (d != null) latin.add(d as String);
  }
  for (var i = 0; i + 1 < words.length; i++) {
    final a = words[i]['canonical'] as String;
    final b = words[i + 1]['canonical'] as String;
    latin
      ..add('$a, $b')
      ..add('$a $b');
  }
  // 3. Shaping cases.
  for (final c in shaping.v3Cases) {
    latin.add(c.startsWith('murda:') ? c.substring(6) : c);
  }
  latin.addAll(shaping.talingIntent.keys);
  // 4. Edge list.
  latin.addAll(edge);

  // 5. Generated from the engine catalogs.
  String stripA(String s) => s.endsWith('a') ? s.substring(0, s.length - 1) : s;
  final onsets = <String>{};
  for (final a in nglegena) {
    onsets
      ..add(a.onset(jgst: false))
      ..add(a.onset(jgst: true));
  }
  for (final m in murdaLinks) {
    onsets
      ..add(stripA(m.aksara.latinPujl))
      ..add(stripA(m.aksara.latinJgst));
  }
  for (final r in rekan) {
    onsets
      ..add(stripA(r.latinPujl))
      ..add(stripA(r.latinJgst));
  }
  onsets.add('');

  final fiveA = <String>[
    for (final o in onsets)
      for (final v in _vowels) '$o$v',
  ];
  latin.addAll(fiveA);
  for (final o in onsets) {
    for (final k in _codas) {
      latin.add('${o}a$k');
    }
  }
  for (final s in fiveA) {
    final first = s.runes.first;
    latin.add(
      String.fromCharCode(first).toUpperCase() +
          String.fromCharCodes(s.runes.skip(1)),
    );
  }
  final pujlOnsets = [for (final a in nglegena) a.onset(jgst: false)];
  for (final x in pujlOnsets) {
    for (final y in pujlOnsets) {
      latin
        ..add('${x}a${y}a')
        ..add('${x}a$y/')
        ..add('${x}a/ ${y}a');
    }
  }
  final ka = javaneseChar('JAVANESE LETTER KA');
  latin
    ..add('a$ka')
    ..add('${ka}a')
    ..add('ha $ka');

  // 6. Random Latin.
  final pool = <int>{
    for (final s in latin) ...s.runes,
    for (var d = 0x30; d <= 0x39; d++) d,
  }.toList()..sort();
  final rnd = Random(20261004);
  for (var i = 0; i < 1500; i++) {
    final len = 1 + rnd.nextInt(12);
    latin.add(
      String.fromCharCodes([
        for (var j = 0; j < len; j++) pool[rnd.nextInt(pool.length)],
      ]),
    );
  }

  final aksara = <String>{};

  // Aksara inputs, in the brief's order: goldens first.
  for (final g in goldenPairs) {
    aksara.add(g.aksara);
  }
  final toAksaraLines = <String>[];
  final latinList = latin.toList();
  final fromLatin = <String>{};
  for (final input in latinList) {
    for (final murda in [false, true]) {
      final r = _attempt(() => AksaraEngine.toAksara(input, useMurda: murda));
      toAksaraLines.add(jsonEncode([input, murda, _record(input, r)]));
      switch (r) {
        case ConvertSuccess(:final output):
          fromLatin.add(output);
        case ConvertAmbiguous(:final candidates):
          for (final c in candidates) {
            fromLatin.add(c.output);
          }
        case ConvertError() || null:
          break;
      }
    }
  }
  aksara.addAll(fromLatin);

  // 3. Block code points and structural combinations.
  final blockCps = javaneseCodepoints.values.toList();
  for (final cp in blockCps) {
    aksara.add(String.fromCharCode(cp));
  }
  aksara
    ..add(String.fromCharCode(0x200C))
    ..add(String.fromCharCode(0xA9CE));
  for (var cp = 0xA9DA; cp <= 0xA9DD; cp++) {
    aksara.add(String.fromCharCode(cp));
  }
  final pangkon = sandhanganPangkon.char;
  final tarung = sandhanganTarung.char;
  for (final n in nglegena) {
    for (final s in sandhangan) {
      aksara.add('${n.char}${s.char}');
    }
  }
  for (final n in nglegena) {
    for (final m in nglegena) {
      aksara.add('${n.char}$pangkon${m.char}');
    }
  }
  for (final s in swara) {
    aksara.add('${s.char}$tarung');
  }
  final dirgaMure = javaneseChar('JAVANESE VOWEL SIGN DIRGA MURE');
  final taling = sandhanganTaling.char;
  aksara
    ..add('$ka$dirgaMure')
    ..add('$ka$dirgaMure$tarung')
    ..add('$ka$taling$tarung');

  // 4. Random aksara.
  final apool = <int>{...blockCps}.toList()..sort();
  for (final cp in [0x200C, 0x61, 0x20, 0x25CC, 0x1F600]) {
    if (!apool.contains(cp)) apool.add(cp);
  }
  final arnd = Random(20261005);
  for (var i = 0; i < 1500; i++) {
    final len = 1 + arnd.nextInt(8);
    aksara.add(
      String.fromCharCodes([
        for (var j = 0; j < len; j++) apool[arnd.nextInt(apool.length)],
      ]),
    );
  }

  final toLatinLines = <String>[];
  for (final input in aksara) {
    for (final scheme in LatinScheme.values) {
      final r = _attempt(() => AksaraEngine.toLatin(input, scheme: scheme));
      toLatinLines.add(jsonEncode([input, scheme.name, _record(input, r)]));
    }
  }

  final out = StringBuffer()
    ..write(
      jsonEncode({
        'source': {
          'repo': 'aksara-app',
          'commit': commit,
          'rulesetId': aksaraEngineRulesetId,
        },
      }).replaceFirst(RegExp(r'\}$'), ','),
    )
    ..write('\n')
    ..write(
      '"stats":${jsonEncode({'latin': latinList.length, 'aksara': aksara.length})},\n',
    )
    ..write('"toAksara":[\n')
    ..write(toAksaraLines.join(',\n'))
    ..write('],\n"toLatin":[\n')
    ..write(toLatinLines.join(',\n'))
    ..write(']}\n');
  File(outPath).writeAsStringSync(out.toString());
  stdout.writeln(
    'wrote $outPath: ${toAksaraLines.length} toAksara, ${toLatinLines.length} toLatin records',
  );
}

/// The engine throws on a few inputs (e.g. a ŕ/ỿ coda); that is a result too,
/// recorded as `["x"]`. Messages differ per runtime and are not compared.
ConvertResult? _attempt(ConvertResult Function() convert) {
  try {
    return convert();
  } catch (_) {
    return null;
  }
}

List<Object?> _record(String input, ConvertResult? r) {
  switch (r) {
    case null:
      return ['x'];
    case ConvertSuccess(:final output):
      return ['s', output];
    case ConvertAmbiguous(
      input: final echoed,
      :final candidates,
      :final reason,
    ):
      return [
        'a',
        reason,
        [for (final c in candidates) c.output],
        _echo(input, echoed),
      ];
    case ConvertError(input: final echoed, :final index, :final message):
      return ['e', index, message, _echo(input, echoed)];
  }
}

String? _echo(String callInput, String resultInput) =>
    resultInput == callInput ? null : resultInput;
