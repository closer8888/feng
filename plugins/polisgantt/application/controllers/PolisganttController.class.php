    <?php class PolisganttController extends ApplicationController {                
            var $plugin_name = "helloworld"; //name of the plugin
     
            function __construct() {
                    parent::__construct();
                    prepare_company_website_controller($this, 'website');              
            }
     
            function say_hello() {
                    $txt = "Hello World ! ! ! ! ";
                    tpl_assign('message',$txt);
            }
    }?>


