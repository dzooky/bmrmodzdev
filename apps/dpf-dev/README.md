# DPF Status DEV

Development copy of **DPF Status 0.1.74** from `dzooky/bmrmodz` commit `24eda19efd308c1d18489febb2af1876faa7af2b`.

- Separate package ID `dpf-dev`, title `DPF Status DEV`, log ID `DPFD`.
- Original DPF code and features are preserved; the only copied-app manifest changes distinguish DEV from stable DPF and require Data Tool 0.1.38.
- Data Tool mode defaults OFF and original TASU direct reads are untouched.
- **Do not run DEV and production DPF simultaneously during early car tests**: they remain independent apps but share vehicle diagnostic facilities and external tools.
- This copy **does not** represent a completed Data Tool migration or real-car verification.
- Follow `../../tools/data-tool/WORKFLOW.md` and `PROGRESS.md`.
- Original production DPF history at copy time is in `SOURCE_PROGRESS.md`.
- Run DPF DEV checks in `.github/workflows/dpf-dev-check.yml`.

