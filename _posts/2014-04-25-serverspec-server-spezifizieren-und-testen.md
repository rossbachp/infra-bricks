---
layout: post
title: "serverspec: Server spezifizieren und testen"
modified: 2014-04-25 14:46:50 +0200
tags: [serverspec,code,andreasschmidt]
category: test
keywords:
  - serverspec
  - serverspec tutorial
  - test
---

In der Softwareentwicklung sind Spezifikation und Testen fester Bestandteil des Arbeitsweise. Unit-Testing und
Test Driven Development haben in der modernen Entwicklung ihren festen Platz, ob agil oder nicht. Bei der
Bereitstellung von IT Infrastruktur, also Netzwerk, Storage und Compute sieht es dagegen noch eher klassisch
aus: Appliances und Server werden aufgebaut und übergeben, und wenn technische Einzelheiten nicht funktionieren,
wird nachgearbeitet.

Bei der Bereitstellung von virtuellen Maschinen sieht es schon etwas besser aus. Hier haben Elemente aus der
Test Driven Infrastruktur Einzug gehalten. VMs entstammen entweder einem Image oder einer strukturierten Installation (z.B. Kickstart),
 und sie erhalten ihre Konfiguration über entsprechende Werkzeuge wie Salt, Ansible oder Puppet.

Aber auch diese Werkzeuge benötigen ihre Konfigurationen, die - je nach Werkzeug - eher gecoded als "spezfiziert" aussehen.
Puppet als Beispiel bietet eine deklarative DSL, aber eine größere Puppetinstallation inkl. PuppetDB und/oder Hiera, Module und
deren Abhängigkeiten besitzt eine eigene Komplexität. Und die muss durch erfahrene Infra-Coder gemanaged werden.

## Wie soll das Endergebnis aussehen?

An welcher Stelle in der Bereitstellungskette wird eigentlich genau beschrieben, "wie" das Endergebnis aussehen soll? Und mit
welcher Sprache?

Ruby-Entwickler kennen mit rspec, cucumber und gherkin Möglichkeiten, (Code-)Funktionalität zu spezifizieren. Die sieht dann - je
nach verwendetem Framework - auch natürlich-sprachlich aus. Dasselbe gibt es nun auch für IT-Infrastruktur, im speziellen: Servern.

## serverspec

[Serverspec](www.serverspec.org) ist ein Werkzeug, um RSpec-Testfälle für Server formulieren und ausführen zu können. Dabei wird
das Endergebnis spezifiziert und getestet. D.h. es ist egal, mit welchem Konfigurationsmanagementtool ein Server aufgesetzt wurde oder
ob er sogar manuell installiert wurde, serverspec testet allein den aktuellen Zustand.

Wie sieht so etwas aus? Ein paar Beispiele:


#### Es sollten User da sein.
```
describe user 'vagrant' do
  it { should exist }
  it { should belong_to_group 'sudo' }
  it { should have_home_directory '/home/vagrant' }
end
```

#### Dateien sollten vorhanden sein, mit bestimmten Inhalten
```
describe file '/home/vagrant/.ssh/authorized_keys' do
  it { should be_file }
  it { should be_mode 600 }
  it { should contain('vagrant@precise64') }
  it { should be_owned_by 'vagrant' }
  it { should be_grouped_into 'vagrant' }
end
```

#### Prozesse sollten laufen, Ports sollten offen sein
```
describe process 'sshd' do
  it { should be_running }
end

describe port(22) do
  it { should be_listening.with 'tcp' }
end
```

An den einfachen Beispielen lässt sich die Funktionsweise von serverspec gut zeigen. Eine Spezifikation besteht aus mehrere Blöcken, worin ein
bestimmter Aspekt (User, File, Process, Port, ...) beschrieben ist. Die Ausdrücke im Block selber findet sich sog. RSpec Expectations und
Matchers, d.h. Ausdrücke die für den jeweiligen Aspekt erfüllt sein sollen. Wie funktioniert nun das Testen selber?

## Wie arbeitet serverspec?

Serverspec kann je nach Modus unterschiedlich arbeiten: Lokal, per SSH auf einen entfernten Host oder z.B. mit Vagrant Plugins in eine virtuelle Maschine.
Dabei werden Kommandos zusammengebaut, um die "Rohdaten" einer Expectation abzufragen und gegen den Matcher zu prüfen. Das klingt eher abstrakt, von
daher ein konkretes Beispiel:

```
describe file '/home/vagrant/.ssh/authorized_keys' do
  it { should be_mode 600 }
```

Es soll also geprüft werden, ob die `authorized_keys` den Mode 600 besitzt. Serverspec wird daraus diese Schritte bauen:

- Eine Verbindung zum Ziel vorbereiten (z.b. per SSH)
- ein Kommando konstruieren, das für das Betriebssystem des Servers passt, also:
   - ```sudo stat -c %a /home/vagrant/.ssh/authorized_keys | grep -- \^600\$```
- das Kommando ausführen, das Ergebnis abholen und vergleich.

In diesem Fall wird vom ```grep``` der Exitcode verwendet, die einfachste Möglichkeit. Bei anderen Abfragen können auch reguläre Ausdrücke eingesetzt werden.

Und so sieht es aus, wenn man es ausführt:
```
/usr/bin/ruby -S rspec spec/node/simple_spec.rb
....
Finished in 0.95 seconds
4 examples, 0 failures
```

Das war jetzt ein kleines Beispiel, wie man mit serverspec Aspekte einer Serverinstallation spezifizieren und testen kann. Serverspec bietet aktuell
ca. 30 dieser Aspekte - genannt Resource Types - an, um vielfältige Dinge zu testen. Die Bandbreite reicht von Repositories, Prozessen, Netzwerk, Dateien,
User und Gruppen bis zu Mounts und Filesystemen.

## Wofür ist das gut?

Die Frage ist gar nicht so leicht zu beantworten, es hängt nämlich davon ab, was für ein Unternehmen man ist, und welcher Art von Einschränkungen man ggf. unterliegt.
Aber es gibt Mehrwert für fast alle Vorhaben. Die drei wichtigsten Gründe für die Verwendung von Tests in der Infrastruktur-Entwicklung sind:

1. **Qualität**: Die Deployment Pipeline kann um eine zusätzliche Qualitätsstufe erweitert werden, die nicht nur die Artefakte auf dem Weg durch die Pipeline testet, sondern auch das Endergebnis.
2. **Auditierbarkeit**: Zur Unterstützung eines IT-Audits lässt sich eine natürlichsprachliche Spezfikation der Serverlandschaft verfassen und automatisiert testen.
3. **Regressionstest**: Auch Server lassen sich nun nach Veränderungen (z.B. Deployments oder anderen Changes) regressionstesten.

## Wie geht's weiter?

Jetzt haben wir nur an der Oberfläche gekratzt, aber hoffentlich Interesse geweckt. Weitere Blogposts werden sich detailliert mit Serverspec befassen.

--
Andreas
