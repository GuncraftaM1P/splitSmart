import React from 'react';
import { ScrollView, Text, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DatenschutzScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.container,
        { paddingTop: Math.max(insets.top, 20) },
      ]}
    >
      <Text style={styles.title}>Datenschutzerklärung</Text>

      <Text style={styles.paragraph}>
        Der Schutz deiner Privatsphäre ist uns wichtig. Grundsätzlich gilt: Wir
        sammeln so wenige Daten wie möglich, nutzen keine Werbetracker und
        verkaufen deine Daten niemals an Dritte.
      </Text>

      <Text style={styles.paragraph}>
        <Text style={{ fontWeight: 'bold' }}>
          Infrastruktur & Speicherung:{'\n'}
        </Text>
        Unsere Datenbanken und Server-Infrastruktur werden von Cloudflare
        bereitgestellt. Wir haben sichergestellt, dass die Speicherung und
        Verarbeitung der Daten primär auf Servern innerhalb der Europäischen
        Union erfolgt.
      </Text>

      <Text style={styles.paragraph}>
        <Text style={{ fontWeight: 'bold' }}>
          Server-Logs & Metadaten:{'\n'}
        </Text>
        Um die Qualität und Sicherheit unserer Dienste zu gewährleisten, werden
        Anfragen an unser Backend von Cloudflare protokolliert. Dabei werden
        technisch notwendige Daten wie IP-Adressen und Metadaten temporär
        gespeichert, um beispielsweise Angriffe abzuwehren. Diese Daten werden
        nicht zur Identifizierung von Personen missbraucht.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    backgroundColor: '#fff',
  },
  scroll: {
    flex: 1,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
    color: '#007AFF',
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 22,
    color: '#222',
    marginBottom: 12,
  },
  footerSpace: {
    height: 40,
  },
});
